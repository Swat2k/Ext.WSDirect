/**
 * Данный провайдер {@link Direct.direct.wsDirectProvider wsDirectProvider} предоставляет доступ
 * к серверным методам на клиенте посредством RPC запросов.
 * 
 * Важные моменты: 
 *  1) Вызвать RPC функцию можно тремя путями
 *      а) Через model & store (для модели метод save, для стора метод sync)
 *      б) Через прямой вызов смапленой функции 
 *         Пример: Direct.meta_test.sleep.sleep_at({sleep_seconds: 10}) (есть и поддержка калбеков, контекстов и прочих плюшек) см Direct.direct.wsRemotingMethod
 *      в) Сырым запросом (смотри как авторизовывается провайдер)
 */
Ext.define('Direct.direct.wsDirectProvider', {
    extend: 'Ext.direct.JsonProvider', 
    alias:  'direct.wsprovider',
    
    type: 'ws',

    id: 'Direct.direct.wsDirectProvider',

    requires: [
        'Ext.util.MixedCollection', 
        'Ext.util.DelayedTask', 
        'Ext.direct.wsExceptionEvent',
        'Ext.direct.RemotingMethod',
        'Ext.direct.Manager',

        'Direct.direct.wsRemotingMethod',
        'Direct.direct.wsTransaction',
    ],

    /**
     * @cfg {String} url
     *
     * url для соединения посредством WebSocket
     */
    url: '',

    /**
     * @cfg {Object} connOpts
     *
     * Опции для установки соединения посредством библиотеки SockJS
     * О них можно почитать тут https://github.com/sockjs/sockjs-client
     */
    connOpts: {},

    /**
     * @cfg {Object} client
     *
     * Текущий инстанс SockJS
     */
    client: null,

    /**
     * @cfg {String} namespace
     *
     * Корневой путь для маппинга функций текущего провайдера
     */
    namespace: 'Direct',

    /**
     * @cfg {Boolean} isAuthorized
     *
     * Флаг прошла ли авторизация успешно, используется только при инициализации 
     * провайдера (авторизировались -> получили мету -> готово)
     */
    isAuthorized: false,

    /**
     * @cfg {Number/Boolean} [enableBuffer=10]
     *
     * `true` или `false` для включения или выключения механизма обьединения запросов в пачки
     * Если указано число, тогда определяет время (ms) ожидания для отсылки батча
     */
    enableBuffer: 10,
    
    /**
     * @cfg {Number} bufferLimit Максимальное количество запросов которое может быть в батче
     * Эта опция ничего не значит, если {@link #enableBuffer} `false`.
     */
    bufferLimit: Number.MAX_VALUE,

    /**
     * @cfg {Number} subscribers Должно быть 1, для правильной инициализации провайдера.
     * Если значение > 0 то ExtJS думает что получение метаинформации прошло успешно
     * У нас же используется немного другой механизм, а именно при завершении инициализации провайдера
     * (установили соединение, авторизировались, получили мету) отсылается event 'connected' в Application
     */
    subscribers: 1,
    
    constructor: function(config) {
        var me = this;

        // Становимся Observable
        me.mixins.observable.constructor.call(me, config);

        // Создаем корневой namespace
        me.namespace = Ext.ns(me.namespace);
        // Создаем буфер вызовов (необходим для обьединения запросов)
        me.callBuffer = [];
        
        // Создаем the SockJS client и подписываемся на события
        me.client = new SockJS(me.url, me.connOpts);
        me.client.onopen = Ext.bind(me.connect, me);
        me.client.onmessage = Ext.bind(me.onData, me); 
        me.client.onclose = Ext.bind(me.disconnect, me);
    },
    
    destroy: function() {
        var me = this;

        Ext.destroy(me.client);
        me.callParent();
    },
    
    /**
     * @inheritdoc
     */
    connect: function() {
        var me = this,
            client = me.client;

        debugger

        let metaFrame = {
            disableBatching: true,
            method : "meta",
            callback: function(result, meta, transaction, options) {
                if (transaction.status) {
                    if (!me.apiCreated) {
                        me.initAPI(meta.result);
                        me.apiCreated = true;
                        me.fireEvent('connected');
                    }
                }
            }
        },

        metaTransaction = new Direct.direct.wsTransaction(metaFrame);
        metaTransaction.send();
    },

    disconnect: function() {
        // ЧТО СДЕСЬ ДЕЛАТЬ ?
    },

    getNamespace: function(root, action) {
        var parts = action.toString().split('.'),
            ns, i, len;

        for (i = 0, len = parts.length; i < len; i++) {
            ns = parts[i];
            root = root[ns];

            if (typeof root === 'undefined') {
                return root;
            }
        }

        return root;
    },

    createNamespaces: function(root, action) {
        var parts, ns, i, len;

        parts = action.toString().split('.');

        for (i = 0, len = parts.length; i < len; i++) {
            ns = parts[i];
            root[ns] = root[ns] || {};
            root = root[ns];
        }

        return root;
    },

    /**
     * Маппинг удаленных функций на клиенте
     *
     * @private
     */
    initAPI: function(meta) {
        var me = this,
            namespace = me.namespace,
            Manager = Ext.direct.Manager,
            cls, methods, i, len, method, handler;

        for (let remoteMethod of meta) {
            // Из имени удаленного метода необходимо сформировать action и method
            // method - это справа на лево до первой точки
            // action - все остальное
            let splitMethodAndAction = remoteMethod.method,
                method = splitMethodAndAction.split('.').slice(-1)[0],
                action = splitMethodAndAction.split('.').reverse().slice(1).reverse().join('.');

            cls = me.createNamespaces(namespace, action);

            method = new Direct.direct.wsRemotingMethod({
                name: method,
                params: remoteMethod.params,
                strict: false // default
            });

            cls[method.name] = handler = me.createHandler(action, method);

            Manager.registerMethod(handler.$name, handler);
        }
    },

    
    /**
     * Создаем обработчик вызова для каждой удаленной функции
     *
     * @param {String} action 
     * @param {Object} method 
     *
     * @return {Function} Обработчик
     *
     * @private
     */
    createHandler: function(action, method) {
        var me = this,
            handler;
        
        handler = function() {
            return me.invokeFunction(action, method, Array.prototype.slice.call(arguments, 0));
        };
        
        handler.name = handler.$name = action + '.' + method.name;
        handler.$directFn = true;
        
        handler.directCfg = handler.$directCfg = {
            action: action,
            method: method
        };

        return handler;
    },
    
    /**
     * Вызов RPC функции на беке
     *
     * @param {String} action 
     * @param {Object} method 
     * @param {Object} args 
     *
     * @return {Object} Транзакция
     * 
     * @private
     */
    invokeFunction: function(action, method, args) {
        var me = this,
            transaction;
        
        transaction = me.configureTransaction(action, method, args);

        if (me.fireEvent('beforecall', me, transaction, method) !== false) {
            me.queueTransaction(transaction);
            me.fireEvent('call', me, transaction, method);
        }
        return transaction;
    },
    
    /**
     * Создаем и конфигурируем транзакцию на основе аргументов
     *
     * @param {String} action
     * @param {Object} method 
     * @param {Array} args 
     *
     * @return {Object} Транзакция
     *
     * @private
     */
    configureTransaction: function(action, method, args) {
        var data, cb, scope, options, params;

        data = method.getCallData(args);
        
        cb = data.callback;
        scope = data.scope;
        options = data.options;

        if (cb && !Ext.isFunction(cb)) {
            Ext.raise("Callback argument is not a function " +
                            "for Ext Direct method " +
                            action + "." + method.name);
        }
        
        cb = cb && scope ? cb.bind(scope) : cb;
        
        params = Ext.apply({}, {
            provider: this,
            args: args,
            params: data.params,
            method: action + '.' + method.name,
            metadata: data.metadata,
            callbackOptions: options,
            callback: cb,
            disableBatching: method.disableBatching
        });

        if (options && options.timeout != null) {
            params.timeout = options.timeout;
        }
        
        return new Direct.direct.wsTransaction(params);
    },
    
    /**
     * Добавляем новую транзакцию в очередь
     *
     * @param {Direct.direct.wsTransaction} transaction Транзакция для добавления в очередь
     *
     * @private
     */
    queueTransaction: function(transaction) {
        var me = this,
            callBuffer = me.callBuffer,
            enableBuffer = me.enableBuffer;

        Ext.direct.Manager.addTransaction(transaction);
        
        if (enableBuffer === false || transaction.disableBatching) {
            me.sendTransaction(transaction);
            return;
        }
        
        callBuffer.push(transaction);

        if (enableBuffer && callBuffer.length < me.bufferLimit) {
            if (!me.callTask) {
                me.callTask = new Ext.util.DelayedTask(me.combineAndSend, me);
            }
            me.callTask.delay(Ext.isNumber(enableBuffer) ? enableBuffer : 10);
        }
        else {
            me.combineAndSend();
        }
    },
    
    /**
     * Собираем пачку транзакций
     *
     * @private
     */
    combineAndSend: function() {
        var me = this,
            buffer = me.callBuffer,
            len = buffer.length;
            
        if (len > 0) {
            me.sendTransaction(len === 1 ? buffer[0] : buffer);
            me.callBuffer = [];
        }
    },
    
    /**
     * Отправка транзакции на бек-енд
     *
     * @param {Object/Array} transaction Транзакции для отправки на бек
     *
     * @private
     */
    sendTransaction: function(transaction) {
        var me = this,
            callData, 
            payload, i, len;

        if (Ext.isArray(transaction)) {
            callData = [];
            for (i = 0, len = transaction.length; i < len; ++i) {
                payload = transaction[i].getPayload();
                callData.push(payload);
            }
        }
        else {
            callData = transaction.getPayload();
        }
        me.client.send(Ext.encode(callData));
    },

   
    /**
     * Рассматриваем ответы от бекенда
     *
     * @private
     */
    onData: function(e) {
        var me = this,
            data = Ext.decode(e.data),
            i, len, events, event, transaction, transactions;

        if (me.destroying || me.destroyed) {
            return;
        }

        // Если произошло исключение
        if (data.error) {
            me.exceptionReceived(data)
        }
        
        // Если пришел результат исполнения запроса
        if (data.result) {
            me.resultReceived(data);
        }
    },

    exceptionReceived: function(response) {
        var me = this,
            exception = new Ext.direct.wsExceptionEvent({
                data: null,
                transaction: transaction,
                code: response.error.code,
                message: response.error.message
            }),
            transaction = me.getTransaction(response.id);

        if (!transaction) return;

        transaction.status = false;     // spoof
        response.status = false;
        transaction.result = response;

        me.fireEvent('data', me, exception);
        me.fireEvent('exception', me, exception);

        if (transaction && me.fireEvent('beforecallback', me, response, transaction) !== false) {
            me.runCallback(transaction, response, false);
        }

        Ext.direct.Manager.removeTransaction(transaction);
    },

    resultReceived: function(response) {
        var me = this,
            transaction = me.getTransaction(response.id);

        if (!transaction) return;
        
        transaction.status = true;     // spoof
        response.status = true;
        transaction.result = response;
            
        me.fireEvent('data', me, response);
        if (transaction) {
            if (me.fireEvent('beforecallback', me, response, transaction) !== false) {
                me.runCallback(transaction, response, true);
            }

            Ext.direct.Manager.removeTransaction(transaction);
        }

    },
    
    /**
     * Получить транзакцию по UUID.
     * 
     * @return {Direct.direct.wsTransaction} Транзакция или null (если не найдена)
     */
    getTransaction: function(uuid) {
        return uuid ? Ext.direct.Manager.getTransaction(uuid) : null;
    },
    
    /**
     * Запускаем любые callbacks связанные с транзакцией.
     *
     * @param {Direct.direct.wsTransaction} transaction The transaction
     * @param {String} event success or failure для обратной совместимости
     *
     */
    runCallback: function(transaction, response, success) {
        var funcName = success ? 'success' : 'failure',
            callback, options, result;

        if (transaction && transaction.callback) {
            callback = transaction.callback,
            options  = transaction.callbackOptions;
            result   = typeof response.result !== 'undefined' ? response.result : response.data;

            if (Ext.isFunction(callback)) {
                callback(result, response, transaction, options);
            }
            else {
                Ext.callback(callback[funcName], callback.scope, [result, response, transaction, options]);
                Ext.callback(callback.callback,  callback.scope, [result, response, transaction, options]);
            }
        }
    }

});
