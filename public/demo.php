<?php

// TODO: set properly
//header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}, smarthsm.net:11180, dragonfly.smarthsm.net:11180");

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: X-Requested-With");
echo file_get_contents('demo.html');
?>
