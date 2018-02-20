Ext.define('Ext.direct.wsExceptionEvent', {
    extend: 'Ext.direct.RemotingEvent',
    alias:  'direct.wsexception',

    status: false,

    constructor: function(config) {
        var me = this;

        Ext.create('Direct.Notification', {
            ui: 'notify-red',
            title: `Server Error (${config.code})`,
            html: config.message
        }).show();

        me.callParent(arguments);
    }

});
