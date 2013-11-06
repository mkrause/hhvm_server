var http = require('http');
var url = require('url');
var qs = require('querystring');
var fs = require('fs');

var scriptPathPrefix = "/tmp/script_";
var hhvmDirPrefix = "/tmp/hhvm_";

function runHhvm(token, onCompiled) {
    var scriptFileName = scriptPathPrefix + token;
    var hhvmDir = hhvmDirPrefix + token;

    var util = require('util');
    var exec = require('child_process').exec;
    var cmd = "../bin/run_hhvm --hphp -thhbc -o " + hhvmDir + " " + scriptFileName;
    exec(cmd, function (error, stdout, stderr) {
        if (error) {
            console.log("HHVM error: " + error);
            return;
        } 
        
        util.print('Compiling with HHVM: ' + stdout);
        
        var outputFileName = hhvmDir + "/hhbc.json";
        var cmd = "../bin/run_json_export " + hhvmDir + "/hhvm.hhbc " + outputFileName;
        exec(cmd, function (error, stdout, stderr) {
            if (error) {
                console.log("Error: " + error);
                return;
            }
            
            util.print('Program text: ' + stdout);
            
            console.log("JSON file written to " + outputFileName);

            fs.readFile(outputFileName, 'utf8', function (error, data) {
                if (error) {
                    console.log(error);
                    return;
                }
                
                // Delete temp files
                var rm = require('rimraf');
                function rmError(error) {
                    if (error) {
                        console.log(error);
                    }
                }
                rm(scriptFileName, rmError);
                rm(hhvmDir, rmError);
                
                onCompiled(data);
            });
        });
    });
}

function compile(script, onCompiled) {
    require('crypto').randomBytes(20, function(ex, buf) {
        var token = buf.toString('hex');
        var fileName = scriptPathPrefix + token;
        fs.writeFile(fileName, script, function(err) {
            if (err) {
                console.log(err);
                return;
            }
            
            runHhvm(token, onCompiled);
        });
    });
}

http.createServer(function (req, res) {
    var body = "";
    var respond = function(script) {
        if (script === undefined) {
            res.writeHead(405, {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'x-requested-with'
            });
            res.end();
            return;
        }

        compile(script, function(program) {
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'x-requested-with'
            });
            res.end(JSON.stringify(JSON.parse(program), null, 4));

            console.log('Done!\n\n');
        });
    };

    if (req.method.toUpperCase() === "OPTIONS") {
        // Echo back the Origin (calling domain) so that the
        // client is granted access to make subsequent requests
        // to the API.
        res.writeHead(
            "204",
            "No Content",
            {
                "access-control-allow-origin": "*",
                "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
                "access-control-allow-headers": "content-type, accept",
                "access-control-max-age": 10, // Seconds.
                "content-length": 0
            }
        );

        // End the response - we're not sending back any content.
        res.end();
        return;
    } else if (req.method.toUpperCase() === "POST") {
        req.on('data', function (data) {
            body += data;
        });
        req.on('end', function () {
            var post = qs.parse(body);
            var script = post.script;
            respond(script);
        });
    } else {
        var queryParams = url.parse(req.url, true).query;
        var script = queryParams.script;
        respond(script);
    }

}).listen(80);

console.log('Server running\n');

