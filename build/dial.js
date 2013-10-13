/**
*
* Name: dial.js
* Version: 0.2
* Description: quasi modal alert-, confirm- and prompt dialogs in JavaScript
* Author: P. Envall (petter.envall@gmail.com, @npup)
* Date: 2013-10-01
*
*
* API:
*   dialog.alert(options[, cb]);
*   dialog.confirm(options[, cb]);
*   dialog.prompt(options[, cb]);
*     options   - (object) options hash:
*                   heading  - (optional string, default "") dialog (h2) heading text
*                   msg      - (optional string, default "") dialog message text
*                   value    - (optional string, default "") default value (prompt dialog only)
*                   focus    - (optional text) set preselected form elemenf for dialog
*                               (no/yes for confirm, cancel/ok/text for prompt) defaults are yes and ok (last buttons in each form)
*                   cssClass - (optional string, default "") extra css class for dialog content element
*                   noEsc    - (optional boolean, default false) sets if dialog should be dismissed when pressing ESC on keyboard
*     cb       -  (function) callback, called on close.
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
    };
  })();

  // build elems and expose show/hide methods
  var elems = (function () {
    var overlay = doc.createElement("div");
    overlay.className = classNames.OVERLAY//"js-dialog-overlay";
    var wrap = doc.createElement("div");
    wrap.className = classNames.WRAP;//"js-dialog-wrap";
    var content = doc.createElement("div"); // gets classname when populated
    wrap.appendChild(content);
    return {
      "overlay": overlay
      , "wrap": wrap
      , "content": content
      , "show": function (options) {
        if (settings.active) {return;}
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
        optionalHeading
        , "  <p>#msg#</p>"
        , "  <form action=# onsubmit='return false;'>"
        , "    <input type=submit data-dialog-submit=ok value=#ok# name=submit-ok>"
        , "  </form>"
      ].join("")
      , "confirm": [
        optionalHeading
        , "  <p>#msg#</p>"
        , "  <form action=# onsubmit='return false;'>"
        , "    <input type=submit data-dialog-submit=no value=#no# name=submit-no>"
        , "    <input type=submit data-dialog-submit=yes value=#yes# name=submit-yes>"
        , "  </form>"
      ].join("")
      , "prompt": [
        optionalHeading
        , "  <p>#msg#</p>"
        , "  <form action=# onsubmit='return false;'>"
        , "    <input type=text name=text>"
        , "    <input type=submit data-dialog-submit=cancel value=#cancel# name=submit-cancel>"
        , "    <input type=submit data-dialog-submit=ok value=#ok# name=submit-ok>"
        , "  </form>"
      ].join("")
    };

  // handlers for submitting/closing the dialogs
  var handlers = {
    "alert": function (/*form, submitAttr*/) {return [];}
    , "confirm": function (form, submitAttr) {return ["yes"==submitAttr];}
    , "prompt": function (form, submitAttr) {return ["ok"==submitAttr ? form.elements.text.value : null];}
    , "handleClose": function (form, submitAttr) {
        var handlers = this, result;
        settings.dialogReplaced = false;
        if (handlers.userCallback) {
          var args = handlers[handlers.type](form, submitAttr);
          result = handlers.userCallback.apply(null, args);
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

  var supportsFocusin = (function () {
      var result = false, a = doc.createElement("a");
      a.href= "#";
      Event.listen(a, "focusin", function () {result = true;});
      doc.body.appendChild(a);
      a.focus();
      doc.body.removeChild(a);
      return result;
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
      if (elem===elems.wrap) {return settings.currentInputs.first.focus();} // redirect astray focus
      var submitAttr = e.target.getAttribute("data-dialog-submit");
      if (!submitAttr || !submitTypes.test(submitAttr)) {return;}
      // Firefox does not seem to give submit buttons focus onclick
      if (handlers.handleClose(elem.form, submitAttr)===false) {elem.focus();}
      // literal false means do not close
      else {elems.hide();}
    }, false);

  // build and show correct dialog
  function setup(type, options, cb) {
    settings.dialogReplaced = true;
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
    elems.show(options);
    focusForm(form, options);
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
  };

}()));