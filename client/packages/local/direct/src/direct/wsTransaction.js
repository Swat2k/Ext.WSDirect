Ext.define('Direct.direct.wsTransaction', {
    alias: 'direct.wsTransaction',

    jsonrpc : "2.0",

    id: null,

    /**
     * @cfg {Ext.direct.Provider} Провайдер используемый этой транзакцией
     */

    provider: null,

    /**
     * Создаем новую транзакцию
     * @param {Object} [config] Конфигурационный обьект
     */
    constructor: function(config) {
        var me = this;
        Ext.apply(me, config);
        me.provider = Ext.Direct.getProvider('Direct.direct.wsDirectProvider');
        me.id = (new Ext.data.identifier.Uuid()).generate();
    },

    getPayload: function() {
        var me = this, 
            payload = {
                id: me.id,
                jsonrpc: me.jsonrpc,
                method : me.method,
                params : {}
            };

        if (this.args && this.args[0]) {
            payload.params = this.args[0]
        }

        if (!me.provider.isAuthorized) {
            payload.params.token = ".eJyrVoovSC3KTcxLzStRsiopKk3VUSotTi2Kz0xRsjI0tjSHcvMSc1OVrJSyM1KVICIQgWolhSSgcKJRRo5SbS0AAOIZWw.DIdIYg.zdKJP3Iqq0B5sPCnmL7HusQ2R60";
        } 

        return payload;
    },

    send: function() {
        var me = this;
        me.provider.queueTransaction(me);
    },

    cancel: function() {
        var me = this;
        me.params = {
            cancel_method : me.method,
            cancel_id : me.id
        }
        me.id = (new Ext.data.identifier.Uuid()).generate();
        me.method = 'cancel';
        me.provider.queueTransaction(me, true); // phantomTransaction true
    }

});
