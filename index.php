<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="author" content="Ekim">
	<meta name="description" content="Cascade Prompt.">
	<meta name="keywords"
	      content="LLM, Excel, Sheets, Google, Microsoft, Access, Smart Sheet">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="csrf-token" content="">

	<!-- SITE TITLE -->
	<title>Cascade Prompt</title>

	<!-- FAVICON AND TOUCH ICONS -->
	<link rel="shortcut icon" href="images/favicon.ico" type="image/x-icon">
	<link rel="icon" href="images/favicon.ico" type="image/x-icon">
	<link rel="apple-touch-icon" href="images/apple-touch-icon.png">
	<link rel="icon" href="images/apple-touch-icon.png" type="image/x-icon">

	<link rel="stylesheet" href="css/bootstrap-icons.min.css">
	<link rel="stylesheet" href="css/cascade.css">

	<link href="css/bootstrap.min.css" rel="stylesheet">
	<script src="js/bootstrap.min.js"></script>
	<script src="js/jquery-3.7.0.min.js"></script>

	<script src="js/cascade.js"></script>
	<script src="js/grid-edit.js"></script>

	<script>

		$(document).ready(function () {
			const grid = new ExcelGrid();
			const gridEditor = new GridEditor(grid);

			// Example usage with new addressing
			grid.setCellValue(1, 'A', 'This is a long text that should expand',false);
			grid.toggleWordWrap(1, 'A',false);

			grid.setCellValue(1, 'C', 'This cell has content',false);
			grid.setCellValue(2, 'B', 'Another test',false);
			grid.setCellValue(2, 'C', 'Adjacent cell',false);

			// grid.setCellValue(1, 'A', 'Hello World!');
			// grid.setCellValue(1, 'C', 'Another cell');
			grid.setCellSize(2, 'B', 2, 2,false);
			// grid.setCellValue(2, 'B', 'Merged Cell');

		});
	</script>

</head>
<body style="background-color: #f8f9fa; padding:0; margin:0;">
<div id="grid-container"></div>
</body>
</html>
