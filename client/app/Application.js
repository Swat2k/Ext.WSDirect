Ext.define('WSDirect.Application', {
    extend: 'Ext.app.Application',
    name: 'WSDirect',
	requires: [
        'Direct.direct.wsDirectProvider',
    ],

    quickTips: false,
    platformConfig: {
        desktop: {
            quickTips: true
        }
    },

    launch: function() {
        debugger

        Ext.direct.Manager.addProvider({
            type: 'ws',
            url: 'http://localhost:3000/direct',
        }).on('connected', function() {
            
            
            debugger


        });
    },

    onAppUpdate: function () {
        Ext.Msg.confirm('Application Update', 'This application has an update, reload?',
            function (choice) {
                if (choice === 'yes') {
                    window.location.reload();
                }
            }
        );
    }

});
