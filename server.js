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
        var cmd = "../bin/run_json_export " + hhvmDir + "/hhvm.hhbci " + outputFileName;
        exec(cmd, function (error, stdout, stderr) {
            if (error) {
                console.log("Error: " + error);
            }
            
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
    var queryParams = url.parse(req.url, true).query;
    var script = queryParams.script;
    
    compile(script, function(program) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(program));

        console.log('Done!\n\n');
    });
    
}).listen(80);

console.log('Server running\n');

