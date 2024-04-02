// ==UserScript==
// @name         Codot AIsisstant
// @namespace    codot.cw.hobovsky
// @version      0.0.1
// @description  Client facade for the Codot bot.
// @author       hobovsky
// @updateURL    https://github.com/hobovsky/codot-client/raw/main/src/codot.user.js
// @downloadURL  https://github.com/hobovsky/codot-client/raw/main/src/codot.user.js
// @match        https://cr.codewars.com/*
// @match        https://www.codewars.com/kata/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=codewars.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      localhost
// @connect      codot-server.fly.dev
// @require      http://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js
// @require      http://ajax.googleapis.com/ajax/libs/jqueryui/1.11.1/jquery-ui.min.js
// @require      https://greasyfork.org/scripts/21927-arrive-js/code/arrivejs.js?version=198809
// ==/UserScript==

(function() {
    console.info("Tampermoneky fired up on " + window.location);
    'use strict';
    var $ = window.jQuery;
    const JQUERYUI_CSS_URL = '//ajax.googleapis.com/ajax/libs/jqueryui/1.11.1/themes/dark-hive/jquery-ui.min.css';
    $.noConflict();
    $("head").append(`
        <link href="${JQUERYUI_CSS_URL}" rel="stylesheet" type="text/css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/default.min.css" type="text/css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/selectize.js/0.15.2/css/selectize.default.min.css" type="text/css">
     `);

    let css = `
.row {
  display: flex;
}

.column {
  flex: 50%;
  padding: 10px;
}

ul.snippetsList {
  list-style-type: disc;
}
`;
    // GM_addStyle(css);

    function fetchAborted() {
        console.info("Fetch aborted.", "info");
    }
    function fetchError() {
        console.info("ERROR!", "error");
    }

    function getCodotServiceHeadersBase() {
        return {
            "Content-Type": "application/json"
        };
    }

    function getCodotServiceRequestBase(route) {
        return {
            // url: 'http://localhost:3000' + route,
            url: 'https://codot-server.fly.dev' + route,
            method: 'POST',
            headers: getCodotServiceHeadersBase(),
            responseType: 'json',
            onabort: fetchAborted,
            onerror: fetchError,
        }
    }

    function askCodot({ userId, testOutput }, f) {

        let noisesTimer = undefined;
        let getMessagesReq = getCodotServiceRequestBase('/halp');
        getMessagesReq.data = JSON.stringify({ userId, testOutput });
        getMessagesReq.onreadystatechange = function(resp){
            if (resp.readyState !== 4) return;
            clearInterval(noisesTimer);
            const msgResp = resp.response;

            if(!msgResp?.message) {
                console.info("no messages: " + JSON.stringify(msgResp));
                return;
            }

            let message = msgResp.message;
            f({reply: message });
        };

        GM_xmlhttpRequest(getMessagesReq);
        //setTimeout(() => { clearInterval(noisesTimer); f({reply: "This is a faked answer"}); }, 10000);

        let noises = [
            "Interesting...",
            "Oh, what is this?",
            "I think I know!",
            "No, wait...",
            "Give me a second...",
            "This code is a mess...",
            "This is a very interesting pattern here...",
            "This variable has a really cool name!",
            "This line definitely could be improved.",
            "I think this could be a bug.",
            "This edge case is not handled...",
            "Is this variable unused?",
            "This function needs more comments.",
            "Inconsistent coding style spotted.",
            "Is this fragment copy/pasted?",
            "This code looks familiar...",
            "This code is not SOLID enough.",
            "This code is not DRY enough.",
            "Is this a global variable?",
            "This cast is risky.",
            "Did anyone test this?",
            "Is this loop really necessary?",
            "Are these variable names meaningful enough?",
            "I'm not sure what this function is supposed to do.",
            "Is this error handling sufficient?",
            "Does this function need to be this long?",
            "I'm not entirely clear on the purpose of this block.",
            "Are these comments explaining enough?",
            "I'm not confident about the logic in this section.",
            "Is this a global variable?",
            "I'm not entirely sure about this algorithm.",
            "Does this code follow best practices?",
            "I'm not entirely convinced by this design.",
            "Is this error handling thorough enough?",
            "Are these variables being used correctly?",
            "I'm not sure about the exception handling here.",
            "Is there a potential risk of overflow here?",
            "Are these casts necessary?",
            "I think this code be simplified.",
            "Shouldn't there be input validation here?",
            "Could this be optimized?",
            "There must a way to refactor this.",
            "This code should be more readable.",
            "Are there memory leaks?",
            "Did anyone even test this?",
            "Is this algorithm overly complex?",
            "Oh, I think it's an infinite loop?",
            "Are you sure this is thread safe?",
            "I think this code is not portable.",
            "Shouldn't there be bounds checking here?",
            "Comments here are not helpful",
            "Whys is this code so complex?",
            "I'm not entirely sure about the intent of this code.",
            "I'm unsure about the correctness of this logic.",
            "Are the global variables necessary?",
            "Should these variables be more descriptive?",
            "I'm not entirely convinced by the choice of algorithm.",
            "This will crash on edge cases.",
            "Magic numbers are bad",
            "Uncle Bob would be proud."
        ];
        noisesTimer = setInterval(() => {
            let noise = noises[Math.random() * noises.length | 0];
            let answerArea = jQuery('#codotReply');
            answerArea.text(answerArea.text() + '\n' + noise);
        }, 1500);
    }

    const clippyAvatarUrl = 'https://legendary-digital-network-assets.s3.amazonaws.com/wp-content/uploads/2021/07/12220923/Clippy-Featured.jpg';
    const letterRainAvatarUrl = 'https://forum.affinity.serif.com/uploads/monthly_2022_03/matrix.gif.b71b28882682073a8d38210e526655b8.gif';

    function buildCodotDialog(lang, library, editor) {

        jQuery('#codotDialog').remove();
        jQuery('body').append(`
            <div class='result-type--tree' id='codotDialog' title='Ask Codot'>
                <img id='avatar' src='${clippyAvatarUrl}' width=200 style='float:left;margin-right: 5px'/>
                <p>Hi! I noticed that you tried to solve a kata but the tests failed. Do you want me to take a look at your solution?</p>
                <hr/>
                <form id='formKataData'>
                    <div>To be able to help you, I have to know your Codewars user ID.</div>
                    <div>User ID: <input id='userId' type='text' size=30/></div>
                    <div>You can find your user ID on your Account Settings page.</div>
                </form>
                <div><pre id='codotReply' style='text-wrap:wrap'/></div>
            </div>`);

        let dialog = jQuery('#codotDialog').dialog({
            autoOpen: false,
            height: 400,
            width: "80%",
            modal: true,
            resizable: true,
            title: "Ask Codot",
            buttons: [
                {
                    text: "Yeah sure!",
                    click: function() {
                        let userId = jQuery('#userId').val();

                        if(userId == "") {
                            jQuery('#codotReply').text("I need to know your user ID to help you!");
                            return;
                        }
                        GM_setValue("codot.userid", userId);
                        let testOutput = jQuery('div.run-results__result-items')[0].innerText;

                        dialog.dialog('option', 'buttons', [
                            {
                                text: "Yeah sure!",
                                disabled: true
                            },
                            {
                                text: "No thanks",
                                click: function() { dialog.dialog("close"); }
                            }
                        ]);
                        jQuery('#formKataData').remove();
                        jQuery('#avatar').attr('src', letterRainAvatarUrl);
                        jQuery('#codotReply').text("Let me take a look at your code...");
                        askCodot({ userId, testOutput }, function(resp) {
                            jQuery('#codotReply').text("Here's what I found:\n\n" + resp.reply);
                            jQuery('#avatar').attr('src', clippyAvatarUrl);
                            dialog.dialog('option', 'buttons', [
                                {
                                    text: "Okay, thanks",
                                    click: function() { dialog.dialog("close"); }
                                }
                            ]);
                        });
                    }
                },
                {
                    text: "No thanks",
                    click: function() { jQuery(this).dialog("close"); }
                }
            ]
        });

        let storedUserId = GM_getValue("codot.userid", "");
        jQuery('#userId').val(storedUserId);

        return dialog;
    }

    function registerCodot(lnk) {

        jQuery(lnk).on("click", lnk, function() {
            console.info("Clicked: " + lnk.id);
            let pathElems = window.location.pathname.split('/');
            let kataId =pathElems[2];
            let editors = jQuery('#code').find('div.CodeMirror');
            let userCode = editors[0].CodeMirror.getValue();
            let userId = App.instance.currentUser.id;
            let language = pathElems[4];

            let registerData = { kataId, userId, userCode, language };
            console.info(JSON.stringify(registerData));

            let req = getCodotServiceRequestBase('/train');
            req.data = JSON.stringify(registerData);
            req.onreadystatechange = function(resp) {
                if (resp.readyState !== 4) return;
                const codotResp = resp.response;
                console.info('Register training: ' + JSON.stringify(codotResp));
            };
            GM_xmlhttpRequest(req);
        });
    }

    function buildCodotTrigger(failedMarker) {
        jQuery('<a id="codotButton"><img src="https://upload.wikimedia.org/wikipedia/en/d/d8/Windows_11_Clippy_paperclip_emoji.png" width=20/></a>').insertAfter(failedMarker);
        jQuery('#codotButton').on('click', function() {
            buildCodotDialog().dialog('open');
        });
    }

    $(document).arrive('div.run-message', {existing: true, onceOnly: false}, function(elem) {
        jQuery('#codotDialog').remove();
        jQuery('#codotButton').remove();
    });

    $(document).arrive("span.failed", {existing: false, onceOnly: false}, function(elem) {
        let text = elem.innerText;
        if(!text.startsWith("Failed:"))
            return;
        console.info("arrived");
        buildCodotTrigger(elem);
    });

    ["#validate_btn", "#attempt_btn", "#submit_btn"].forEach(linkid => {
        $(document).arrive(linkid, {existing: true, onceOnly: false}, function(elem) {
            registerCodot(elem);
        });
    });
    $(document).arrive("h1.page-title", {existing: false, onceOnly: false}, function(elem) {
        let text = elem.innerText;
        if(text != "Account Settings")
            return;
        jQuery('#edit_user').prepend(`<div>Your user id: ${App.instance.currentUser.id}</div>`);
    });
})();
