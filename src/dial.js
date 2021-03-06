/**
*
* Name: dial.js
* Version: 0.6.1
* Description: quasi modal alert-, confirm-, prompt and message dialogs in JavaScript
* Author: P. Envall (petter.envall@gmail.com, @npup)
* Date: 2013-11-20
*
*
* API:
*   dial.alert(options[, cb]);
*   dial.msg(options[, cb]);
*   dial.confirm(options[, cb]);
*   dial.prompt(options[, cb]);
*
* Arguments:
*
*     options   - (object) options hash:
*                   heading  - (optional string, default "") dialog heading text
*                   msg      - (optional string, default "") dialog message HTML text
*                   value    - (optional string, default "") default value (prompt dialog only)
*                   focus    - (optional text) set preselected form elemenf for dialog
*                               (no/yes for confirm, cancel/ok/text for prompt) defaults are yes and ok (last buttons in each form)
*                   cssClass - (optional string, default "") extra css class for dialog content element
*                   noESC    - (optional boolean, default false) sets if dialog should be dismissed when pressing ESC on keyboard
*
*     cb       -  (function) callback, called on close.
*                 The callback receives a dialog status object with the properties "value" and "form"
*
*
* There is also a short form where "options" is just an HTML string,
* which is used as if it was passed as options.msg.
* All other options will be taken from the default settings.
*
*   Example:
*     dial.msg("You're afraid you can't let me do that!");
*     dial.confirm("I will call you Mr. Maybe", function (status) { console.log(status.value); });
*
*/
var dial;
("undefined" == typeof dial) && (dial = (function () {

  var global = this, doc = global.document;
  var classNames = (function () {
    var prefix = "js-dial";
    return {
      "OVERLAY": [prefix, "overlay"].join("-")
      , "WRAP": [prefix, "wrap"].join("-")
      , "HEADING": [prefix, "heading"].join("-")
      , "CONTENT": [prefix, "wrap"].join("-")
      , "forContent": function (type) {
        return [prefix, prefix+"-"+type].join(" ");
      }
      , "HIDE": [prefix, "hide"].join("-")
    };
  })();

  var hideExpr = new RegExp("^(.*)"+classNames.HIDE+"(.*)$");

  // build elems and expose show/hide methods
  var elems = (function () {
    var overlay = doc.createElement("div");
    overlay.className = classNames.OVERLAY;
    var wrap = doc.createElement("div");
    wrap.className = classNames.WRAP;
    var content = doc.createElement("div"); // gets classname when populated
    wrap.appendChild(content);
    return {
      "overlay": overlay
      , "wrap": wrap
      , "content": content
      , "show": function (options, wasActive) {
          if (settings.active) {return;}
          if (!wasActive) {
            overlay.className += classNames.HIDE;
            content.className += classNames.HIDE;
          }
          doc.body.appendChild(elems.overlay);
          doc.body.appendChild(elems.wrap);
          settings.currentInputs = (function () {
            var list = elems.content.getElementsByTagName("input");
            return {
              "first": list[0]
              , "last": list[list.length-1]
            };
          })();
          settings.noESC = !!options.noESC;
          settings.active = true;
          if (!wasActive) {
            setTimeout(function () {
                overlay.className = overlay.className.replace(hideExpr, "$1 $2");
                content.className = content.className.replace(hideExpr, "$1 $2");
              }
              , 0
            );
          }
        }
      , "hide": function () {
          if (!settings.active) {return;}
          doc.body.removeChild(elems.overlay);
          doc.body.removeChild(elems.wrap);
          settings.currentInputs = null;
          settings.noESC = false;
          settings.active = false;
        }
    };
  })();

  // Settings for current dialog
  var settings = {
    "active": false
    , "noESC": false
    , "dialogReplaced": false
    , "currentInputs": null
  };

  // content of dialogs
  var submitTypes = /^(yes|no|ok|cancel)$/
    , optionalHeading = "<h2 class='"+classNames.HEADING+"'>#heading#</h2>"
    , texts = {
        "ok": "Ok"
        , "cancel": "Cancel"
        , "yes": "Yes"
        , "no": "No"
      }
    , templates = {
      "alert": [
          "  <form action=# onsubmit='return false;'>"
          , optionalHeading
          , "  <p>#msg#</p>"
          , "  <div class=js-dial-inputs>"
          , "    <input type=submit data-dial-submit=ok value=#ok# name=submit-ok>"
          , "  </div>"
          , "  </form>"
        ].join("")
      , "confirm": [
          "  <form action=# onsubmit='return false;'>"
          , optionalHeading
          , "  <p>#msg#</p>"
          , "  <div class=js-dial-inputs>"
          , "    <input type=submit data-dial-submit=no value=#no# name=submit-no>"
          , "    <input type=submit data-dial-submit=yes value=#yes# name=submit-yes>"
          , "  </div>"
          , "  </form>"
        ].join("")
      , "prompt": [
          "  <form action=# onsubmit='return false;'>"
          , optionalHeading
          , "  <p>#msg#</p>"
          , "  <div class=js-dial-inputs>"
          , "    <input type=text name=text>"
          , "    <input type=submit data-dial-submit=cancel value=#cancel# name=submit-cancel>"
          , "    <input type=submit data-dial-submit=ok value=#ok# name=submit-ok>"
          , "  </div>"
          , "  </form>"
        ].join("")
      , "msg": [
          "  <form action=# onsubmit='return false;'>"
          , optionalHeading
          , "  <p>#msg#</p>"
          , "  <div class=js-dial-inputs>"
          , "    <input type=submit data-dial-submit=ok value=X name=submit-ok>" // can &#x274c; be used quite reliably?
          , "  </div>"
          , "  </form>"
        ].join("")
    };

  // handlers for submitting/closing the dialogs
  var handlers = {
    "alert": function (form/*, submitAttr*/) {return {"form": form};}
    , "confirm": function (form, submitAttr) {return {"form": form, "value": "yes"==submitAttr};}
    , "prompt": function (form, submitAttr) {return {"form": form, "value": "ok"==submitAttr ? form.elements.text.value : null};}
    , "msg": function (form/*, submitAttr*/) {return {"form": form};}
    , "handleClose": function (form, submitAttr) {
        var handlers = this, result;
        settings.dialogReplaced = false;
        if (handlers.userCallback) {
          var arg = handlers[handlers.type](form, submitAttr);
          result = handlers.userCallback(arg);
          if (settings.dialogReplaced) {
            // If another dialog was opened it will have replaced the previous,
            // and we should not close the new one (or destroy the new callback)
            // as the result of this callback.
            // Also, restore the inceptionopenersemaphor
            result = settings.dialogReplaced = false;
          }
          if (result!==false) {delete handlers.userCallback;}
        }
        return result;
      }
    };

  // le basic event abstraction
  var Event = (function () {
    var listen = (function () {
      return "function" == typeof doc.body.addEventListener ?
        function (elem, name, handler, capture) {
          elem.addEventListener(name, handler, !!capture);
        } :
        function (elem, name, handler) {
          elem.attachEvent("on"+name, function (event) {
            event || (event = global.event);
            event.target || (event.target = event.srcElement);
            handler(event);
          });
        };
      })()
      , prevent = function (e) {
        if ("preventDefault" in e) {prevent = function (e) {e.preventDefault();};}
        else {prevent = function (e) {e.returnValue = false;};}
        prevent(e);
      };

    return {
      "listen": listen
      , "prevent": prevent
    };
  })();


  // handle tabbing out of the dialog
  Event.listen(doc, "keydown", function (e) {
    if (e.keyCode != 9 || !settings.currentInputs) {return;}
    var leavingElem = doc.activeElement, refocus;
    if (e.shiftKey) {leavingElem == settings.currentInputs.first && (refocus = settings.currentInputs.last);}
    else {leavingElem == settings.currentInputs.last && (refocus = settings.currentInputs.first);}
    refocus && (refocus.focus(), Event.prevent(e));
  });

  // handle close on pressing ESC
  Event.listen(doc, "keyup", function (e) {
      if (e.keyCode == 27 && !settings.noESC) {elems.hide();}
    }, false);

  var supportsFocusin = false;
  (function () {
      var a = doc.createElement("a");
      a.href= "#";
      a.style.position = "fixed";
      Event.listen(a, "focusin", function () {supportsFocusin = true;});
      doc.body.appendChild(a);
      a.focus();
      a.parentNode.removeChild(a);
      a = null;
    })();

  function preventFocusOutsideDialog(e) {
    if (!settings.active) {return;}
    var elem = e.target, node = elem;
    while (node) {
      if (node === elems.wrap) {return;}
      node = node.parentNode;
    }
    settings.currentInputs.first.focus();
  }
  if (supportsFocusin) {Event.listen(doc, "focusin", preventFocusOutsideDialog);}
  else {Event.listen(doc, "focus", preventFocusOutsideDialog, true);}

  // handle submitting dialog forms
  Event.listen(doc, "click", function (e) {
      var elem = e.target;
      if ("msg" == settings.type && elem === elems.wrap) { // simple msg is closed on click "anywhere outside"
        elems.hide(); return;
      }
      if (elem===elems.wrap) {settings.currentInputs.first.focus(); return;} // redirect astray focus
      var submitAttr = e.target.getAttribute("data-dial-submit");
      if (!submitAttr || !submitTypes.test(submitAttr)) {return;}
      // Firefox does not seem to give submit buttons focus onclick
      if (handlers.handleClose(elem.form, submitAttr)===false) {elem.focus();} // literal false means do not close
      else {elems.hide();}
    }, false);

  // build and show correct dialog
  function setup(type, options, cb) {
    settings.dialogReplaced = true;
    settings.type = type;
    var wasActive = settings.active;
    elems.hide();
    if ("string" == typeof options) {options = {"msg": options};}
    ("msg" in options) || (options.msg = "");
    var template = templates[type]
      , html = (options.heading ? template.replace(/#heading#/, options.heading) : template.replace(optionalHeading, ""))
        .replace(/#msg#/, options.msg)
        .replace(/#ok#/, texts.ok).replace(/#cancel#/, texts.cancel)
        .replace(/#yes#/, texts.yes).replace(/#no#/, texts.no);
    elems.content.className = [classNames.forContent(type), options.cssClass || ""].join(" ");
    elems.content.innerHTML = html;
    handlers.type = type;
    handlers.userCallback = cb;
    var form = elems.content.getElementsByTagName("form")[0];
    elems.show(options, wasActive);
    form && focusForm(form, options);
    return form;
  }

  // after dialog creation, possibly focus some control
  function focusForm(form, options) {
    var formElems = form.elements;
    if (submitTypes.test(options.focus)) {formElems["submit-"+options.focus].focus();}
    else if ("text" == options.focus) {formElems[options.focus] && formElems[options.focus].select();}
    else {formElems[formElems.length-1].focus();}
  }

  // Public API
  return {
    "alert": function (options, cb) {setup("alert", options || {}, cb);}
    , "confirm": function (options, cb) {setup("confirm", options || {}, cb);}
    , "prompt": function (options, cb) {
      options || (options = {});
      options.focus || (options.focus = "text");
      var form = setup("prompt", options, cb);
      form.elements.text.value = options.value || "";
    }
    , "msg": function (options, cb) {
      setup("msg", options || {}, cb);
    }
  };

}()));

var module, require, exports;
(function () {
  var toExport = {"dial": dial};
  (function() {
    var undefinedType = "undefined";
    if (undefinedType!=typeof module && undefinedType != typeof module.exports && "function" == typeof require) {
      for (var name in this) {exports[name] = this[name];}
    }
  }.call(toExport));
})();
