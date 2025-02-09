<!doctype html>
<!--[if lt IE 7 ]>
<html class="ie ie6" lang="en"> <![endif]-->
<!--[if IE 7 ]>
<html class="ie ie7" lang="en"> <![endif]-->
<!--[if IE 8 ]>
<html class="ie ie8" lang="en"> <![endif]-->
<!--[if (gte IE 9)|!(IE)]><!-->
<html lang="en">


<head>

	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="author" content="DSAThemes">
	<meta name="description" content="Discover a new beginning.">
	<meta name="keywords"
	      content="Responsive, HTML5, DSAThemes, Landing, Software, Mobile App, SaaS, Startup, Creative, Digital Product">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="csrf-token" content="">

	<!-- SITE TITLE -->
	<title>Cascade Prompt</title>

	<!-- FAVICON AND TOUCH ICONS -->
	<link rel="shortcut icon" href="../images/favicon.ico" type="image/x-icon">
	<link rel="icon" href="../images/favicon.ico" type="image/x-icon">
	<link rel="apple-touch-icon" sizes="152x152" href="images/apple-touch-icon-152x152.png">
	<link rel="apple-touch-icon" sizes="120x120" href="images/apple-touch-icon-120x120.png">
	<link rel="apple-touch-icon" sizes="76x76" href="images/apple-touch-icon-76x76.png">
	<link rel="apple-touch-icon" href="../images/apple-touch-icon.png">
	<link rel="icon" href="../images/apple-touch-icon.png" type="image/x-icon">

	<link rel="stylesheet" href="../css/bootstrap-icons.min.css">
	<link rel="stylesheet" href="css/cascade-prompt.css">

	<link href="../css/bootstrap.min.css" rel="stylesheet">
	<script src="../js/bootstrap.min.js"></script>
	<script src="../js/jquery-3.7.0.min.js"></script>

	<script src="js/cascade-prompt.js"></script>
	<script src="js/cascade-prompt-keypress.js"></script>
	<script src="js/cascade-prompt-ui.js"></script>

</head>

<body class="bg-light" style="margin-left: 0px; padding-left: 0px; overflow: hidden;">
<h5 style="margin:10px;"><img src="../images/android-chrome-192x192.png" style="height: 32px;"> Cascade Prompt</h5>
<div style="margin-left: 10px; margin-right: 10px; margin-top:10px;">
	<div style="background-color: #eeeeff; border-radius: 10px; padding:5px; padding-left: 20px;">

		<button type="button" class="btn btn-sm btn-outline-info">
			<i class="bi bi-arrow-counterclockwise" style="color:black;"></i>
		</button>
		<button type="button" class="btn btn-sm btn-outline-info">
			<i class="bi bi-arrow-clockwise" style="color:black;"></i>
		</button>
		<button type="button" class="btn btn-sm btn-outline-info">
			<i class="bi bi-type-bold" style="color:black;"></i>
		</button>
		<button type="button" class="btn btn-sm btn-outline-info">
			<i class="bi bi-type-italic" style="color:black;"></i>
		</button>
		<button type="button" class="btn btn-sm btn-outline-info">
			<i class="bi bi-type-strikethrough" style="color:black;"></i>
		</button>
		<button type="button" class="btn btn-sm btn-outline-info">
			<i class="bi bi-paint-bucket" style="color:black;"></i>
		</button>
		<button type="button" class="btn btn-sm btn-outline-info">
			<i class="bi bi-grid" style="color:black;"></i>
		</button>
		<button type="button" class="btn btn-sm btn-outline-info">
			<i class="bi bi-justify-left" style="color:black;"></i>
		</button>
	</div>
</div>

<div class="spreadsheet-container" id="spreadsheet-container">
	<div id="selection-helper" class="active-animation no-select"></div>
	<table class="spreadsheet no-select">
		<thead>
		<tr>
			<th class="top-corner-cell"></th>
			<?php
				$alphabet = range('A', 'Z');
				foreach ($alphabet as $letter) {
					echo "<th class='letter-cell'>$letter</th>";
				}
			?>
		</tr>
		</thead>
		<tbody>
		<?php
			for ($i = 1; $i <= 100; $i++) {
				echo "<tr>";
				echo "<th class='counter-cell'>$i</th>";
				for ($j = 0; $j < count($alphabet); $j++) {
					echo "<td class='text-cell'></td>";
				}
				echo "</tr>";
			}
		?>
		</tbody>
	</table>


</div>

</body>
</html>
