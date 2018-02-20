/*
 * This file launches the application by asking Ext JS to create
 * and launch() the Application class.
 */
Ext.application({
    extend: 'WSDirect.Application',

    name: 'WSDirect',

    requires: [
        // This will automatically load all classes in the WSDirect namespace
        // so that application classes do not need to require each other.
        'WSDirect.*'
    ],

    // The name of the initial view to create.
    mainView: 'WSDirect.view.main.Main'
});
