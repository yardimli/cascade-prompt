<?php

	$index_source = file_get_contents('index.php');
	//replace linebreaks with spaces
	$index_source = preg_replace('/\r\n|\r|\n/', ' ', $index_source);
	$cascade_prompt_js = file_get_contents('js/cascade-prompt.js');
	$cascade_prompt_js = preg_replace('/\r\n|\r|\n/', ' ', $cascade_prompt_js);
	$css_file = file_get_contents('css/cascade-prompt.css');
	$css_file = preg_replace('/\r\n|\r|\n/', ' ', $css_file);

	echo 'index.php<br>';
	echo htmlentities($index_source);
	echo '<br><br>';
	echo 'js/cascade-prompt.js<br>';
	echo htmlentities($cascade_prompt_js);
	echo '<br><br>';
	echo 'css/cascade-prompt.css<br>';
	echo htmlentities($css_file);

