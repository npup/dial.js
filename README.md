dial.js
=====

js/css alert-, confirm-, prompt- and message dialogs. ie8+

dial.js is a simple way to create quasi modal dialogs. Provide your heading (optional) and message HTML texts and use any of the dialog types *msg*, *alert*, *confirm* or *prompt*.

### Extra options

- cssClass	- extra CSS class for the body of the message dialog
- noESC		- dialog won't go away from pressing ESC
- focus		- form input (name) to give initial focus (*yes*, *no*, *ok*, *cancel*, *text* as appropriate)
- value		- (prompt only) default value, prefilled

### Callback
All types of dialogs can have a callback to check status when closed. The callback receives a status object with two properties:

- value		- *true* or *false* for confirm, *null* or \*value\* for prompt, *undefined* for alert and msg
- form 		- the widget's form in all its glory

If `false` is returned from the callback, the dialog won't be closed.

## Sample usage

View live examples at [http://npup.github.io/dial.js/](http://npup.github.io/dial.js/ "Example pages")

#### Message box - dial.msg(...)
	dial.msg("HELO");
	dial.msg({"heading": "HELO", "msg": "wrrld"});

** The message box also goes away when clicking anywhere outside the box. **

#### Alert box - dial.alert(...)
	dial.alert({"heading": "WARNING", "msg": "Hostile world ahead"});

#### Confirm box - dial.confirm(...)
	dial.confirm("Did you hear it through the grape vine?", function (status) {
		if (status.value) {dial.alert("That is truly remarkable.");}
	});

#### Prompt box - dial.prompt(...)
	dial.prompt({"heading": "STOP!", "msg": "Enter secret number (3)."});

##### Prompt box with some validation in callback
	dial.prompt({
			"heading": "STOP!"
			, "msg": "Number Time!<br>Give an integer between 1 and 100!"
		}
		, function (status) {
			var val = status.value;
			if (!val) {return false;}
			if (/\s*\D+\s*/.test(val)) {return false;}
			var i = parseInt(val, 10);
			if (i < 1 || i > 100) {return false;}
			console.log(i);
		}
	);
