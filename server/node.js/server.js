var httpServer = require('http').createServer(),
    sockjsServer = require('sockjs').createServer({
        sockjs_url: "https://cdnjs.cloudflare.com/ajax/libs/sockjs-client/1.1.4/sockjs.min.js"
    });

httpServer.addListener('upgrade', function(req,res){
    res.end();
});

sockjsServer.on('connection', function(conn) {
    conn.on('data', function(message) {
        conn.write(message);
    });
});

sockjsServer.installHandlers(httpServer, {
    prefix:'/direct'
});

console.log(' [*] Listening on 0.0.0.0:3000' );

httpServer.listen(3000, '0.0.0.0');