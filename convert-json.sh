#!/bin/sh

../bin/run_hhvm --hphp -thhbc -o hhvm test.php
../bin/run_json_export hhvm/hhvm.hhbc "$@"
