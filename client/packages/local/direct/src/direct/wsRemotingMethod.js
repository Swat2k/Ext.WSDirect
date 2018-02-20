Ext.define('Direct.direct.wsRemotingMethod', {
    extend: 'Ext.direct.RemotingMethod', 

    // /**
    //  * Takes the arguments for a Direct function and splits the arguments
    //  * from the scope and the callback.
    //  *
    //  * @param {Array} args The arguments passed to the direct call
    //  *
    //  * @return {Object} An object with 4 properties: args, callback, scope, and options object.
    //  */
    // getCallData: function(args, method) {
    //     var me = this,
    //         len  = me.len,
    //         params = me.params,
    //         strict = me.strict,
    //         callback, scope, name, options;

    //     // Есть два типа вызова, ручной и автоматический (например при store sync)
    //     paramsWithValue = args[0];
    //     callback = args[1];
    //     scope    = args[2];
    //     options  = args[3];

    //     // Если это автоматический вызов, тогда мы ложим параметры внутрь items
    //     if (scope && scope.$className === 'Ext.data.proxy.Direct') {
    //         paramsWithValue = {
    //             items: Ext.isObject(paramsWithValue) ? [paramsWithValue] : paramsWithValue
    //         }
    //     }

    //     // filter out any non-existent properties unless !strict 
    //     // if (strict) {
    //     //     for (name in paramsWithValue) {
    //     //         if (paramsWithValue.hasOwnProperty(name) && !params[name]) {
    //     //             delete paramsWithValue[name];
    //     //         }
    //     //     }
    //     // }
       
    //     return {
    //         params: paramsWithValue,
    //         callback: callback,
    //         scope: scope,
    //         options: options
    //     };
    // }

});
