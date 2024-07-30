// ==UserScript==
// @name         Codot AIsisstant
// @namespace    codot.cw.hobovsky
// @version      0.0.5
// @description  Client facade for the Codot bot.
// @author       hobovsky
// @updateURL    https://github.com/hobovsky/codot-client/raw/main/src/codot.user.js
// @downloadURL  https://github.com/hobovsky/codot-client/raw/main/src/codot.user.js
// @match        https://www.codewars.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=codewars.com
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      localhost
// @connect      codot-server.fly.dev
// @require      http://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js
// @require      http://ajax.googleapis.com/ajax/libs/jqueryui/1.13.2/jquery-ui.min.js
// @require      https://greasyfork.org/scripts/21927-arrive-js/code/arrivejs.js?version=198809
// @require      https://cdn.jsdelivr.net/npm/marked/marked.min.js
// ==/UserScript==

(function() {
    'use strict';

    var $ = window.jQuery;
    const JQUERYUI_CSS_URL = '//ajax.googleapis.com/ajax/libs/jqueryui/1.13.2/themes/dark-hive/jquery-ui.min.css';
    $.noConflict();
    $("head").append(`
        <link href="${JQUERYUI_CSS_URL}" rel="stylesheet" type="text/css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/default.min.css" type="text/css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/selectize.js/0.15.2/css/selectize.default.min.css" type="text/css">
     `);

    let css = `
    .codot_panel > * {
      margin: 15px
    }
`;
    GM_addStyle(css);

    function fetchAborted() {
        console.info("Fetch aborted.", "info");
    }
    function fetchError(resp) {
        console.info("ERROR!:\n" + JSON.stringify(resp));
    }

    function getCodotServiceHeadersBase() {
        return {
            "Content-Type": "application/json"
        };
    }

    function getCodotServiceRequestBase(route) {
        return {
            url: 'http://localhost:3000' + route,
            // url: 'https://codot-server.fly.dev' + route,
            method: 'POST',
            headers: getCodotServiceHeadersBase(),
            responseType: 'json',
            onabort: fetchAborted,
            onerror: fetchError,
        }
    }

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

    function setupHelpPanel(f) {
        jQuery('#codot-pnl-help').append(`
        <p>When your tests fail, I can take a look at your solution and help you with failed tests. Do you want me to try?</p>
        <button id='codot-help'>Yeah, go ahead</button>
        <div id='codot-help-reply'></div>
        `);
        jQuery('#codot-help').button().on("click", function() {
            let helpOutput = jQuery('#codot-help-reply')
            helpOutput.text('');
            let runner = App.instance.controller?.outputPanel?.runner;
            if(!runner || !runner.request || !runner.response) {
                f({ reply: "You need to run tests firts!" });
                return;
            }
            let { request, response } = runner;
            let pathElems = window.location.pathname.split('/');
            let kataId    = pathElems[2];
            let userCode  = request.code;
            let userId    = App.instance.currentUser.id;
            let language  = request.language;
            let runnerResponse = response;

            if(response.result?.completed){
                f({ reply: "All your tests passed! Good job!" });
                return;
            }

            let helpReqData = { kataId, userId, userCode, language, runnerResponse };
            let noisesTimer = undefined;
            let getHelpReq = getCodotServiceRequestBase('/halp');
            let { onabort } = getHelpReq;
            getHelpReq.onabort = function() { clearInterval(noisesTimer); onabort(); };
            getHelpReq.onerror = function(resp) {
                clearInterval(noisesTimer);
                let msg = "I am sorry, something bad happened, I am unable to help you.";
                if(resp?.error)
                    msg += '\n\n' + resp.error;
                f({reply: msg });
            };
            getHelpReq.data = JSON.stringify(helpReqData);
            getHelpReq.onreadystatechange = function(resp){
                if (resp.readyState !== 4) return;
                clearInterval(noisesTimer);

                if (resp.status == 429) {
                    f({reply: `You have to wait.\n${resp.response?.message ?? ""}`});
                    return;
                } else if (resp.status == 413) {
                    f({reply: `Ooohhh that's way too much for me!\n${resp.response?.message ?? ""}` });
                    return;
                } else if (resp.status >= 400) {
                    f({reply: `Something went wrong!\n${resp.response?.message ?? ""}`});
                    return;
                }

                const msgResp = resp.response?.message;
                if(!msgResp) {
                    f({reply: "I got no response from the server, I think something went wrong."});
                    return;
                }
                f({reply: msgResp });
            };
            GM_xmlhttpRequest(getHelpReq);
            //setTimeout(() => { clearInterval(noisesTimer); f({reply: "This is a faked answer"}); }, 10000);
            noisesTimer = setInterval(() => {
                let noise = noises[Math.random() * noises.length | 0];
                helpOutput.append(`<p>${noise}</p>`);
            }, 1500);
        });
    }

    function setupReviewPanel(f) {
        jQuery('#codot-pnl-review').append(`
        <p>I can perform a review of your code. Do you want me to try?</p>
        <button id='codot-review'>Yeah, go ahead</button>
        <div id='codot-review-reply'></div>
        `);
        jQuery('#codot-review').button().on("click", function() {
            let reviewOutput = jQuery('#codot-review-reply')
            reviewOutput.text('');

            let pathElems = window.location.pathname.split('/');
            let kataId    = pathElems[2];
            let solution  = jQuery('#code .CodeMirror')[0].CodeMirror.getValue();
            let userId    = App.instance.currentUser.id;
            let language  = pathElems[4] ?? 'unknown';

            let reviewReqData = { userId, kataId, language, code: solution };
            let noisesTimer = undefined;
            let getReviewReq = getCodotServiceRequestBase('/unclebot');
            let { onabort } = getReviewReq;

            getReviewReq.onabort = function() { clearInterval(noisesTimer); onabort(); };
            getReviewReq.onerror = function(resp) {
                clearInterval(noisesTimer);
                let msg = "I am sorry, something bad happened, I am unable to help you.";
                if(resp?.error)
                    msg += '\n\n' + resp.error;
                f({reply: msg });
            };

            getReviewReq.data = JSON.stringify(reviewReqData);
            getReviewReq.onreadystatechange = function(resp){
                if (resp.readyState !== 4) return;
                clearInterval(noisesTimer);

                if (resp.status == 429) {
                    f({reply: `You have to wait.\n${resp.response?.message ?? ""}`});
                    return;
                } else if (resp.status == 413) {
                    f({reply: `Ooohhh that's way too much for me!\n${resp.response?.message ?? ""}` });
                    return;
                } else if (resp.status >= 400) {
                    f({reply: `Something went wrong!\n${resp.response?.message ?? ""}`});
                    return;
                }

                const msgResp = resp.response?.message;
                if(!msgResp) {
                    f({reply: "I got no response from the server, I think something went wrong."});
                    return;
                }
                f({reply: msgResp });
            };

            GM_xmlhttpRequest(getReviewReq);
            //setTimeout(() => { clearInterval(noisesTimer); f({reply: "This is a faked answer"}); }, 10000);

            noisesTimer = setInterval(() => {
                let noise = noises[Math.random() * noises.length | 0];
                reviewOutput.append(`<p>${noise}</p>`);
            }, 1500);
        });
    }

    function setupLinterPanel(f) {
        jQuery('#codot-pnl-lint').append(`
        <p>I can run linter on your code and check style of your code. Do you want me to try?</p>
        <button id='codot-lint'>Yeah, go ahead</button>
        <div id='codot-lint-reply'></div>
        `);
        jQuery('#codot-lint').button().on("click", function() {
            jQuery('#codot-lint-reply').text('');
            let pathElems = window.location.pathname.split('/');
            let kataId    = pathElems[2];
            let language  = pathElems[4] ?? 'unknown';
            let code      = jQuery('#code .CodeMirror')[0].CodeMirror.getValue();
            let userId    = App.instance.currentUser.id;
            let lintReq   = getCodotServiceRequestBase('/lint');

            lintReq.onerror = function(resp) {
                let msg = "I am sorry, something bad happened, I am unable to help you.";
                if(resp?.error)
                    msg += '\n\n' + resp.error;
                f({reply: msg});
            };

            lintReq.data = JSON.stringify({ code, kataId, language, userId });
            lintReq.onreadystatechange = function(resp){
                if (resp.readyState !== 4) return;

                if (resp.status == 429) {
                    f({reply: `You have to wait.\n${resp.response?.message ?? ""}`});
                    return;
                } else if (resp.status == 413) {
                    f({reply: `Ooohhh that's way too much for me!\n${resp.response?.message ?? ""}` });
                    return;
                } else if (resp.status >= 400) {
                    f({reply: `Something went wrong!\n${resp.response?.message ?? ""}`});
                    return;
                }

                const lintItems = resp.response?.lintItems;
                if(!lintItems) {
                    f({reply: "I got no response from the server, I think something went wrong."});
                    return;
                }
                f({ lintItems });
            };
            GM_xmlhttpRequest(lintReq);
        });
    }

    function sendAuthorReviewRequest(snippets, f) {

        let pathElems = window.location.pathname.split('/');
        let kataId    = pathElems[2];
        let language  = pathElems[4] ?? 'unknown';
        let userId    = App.instance.currentUser.id;

        const req = getCodotServiceRequestBase('/author_review');
        req.data = JSON.stringify({ snippets, kataId, language, userId });
        console.info(`Req data len: ${req.data.length}`);
        req.onreadystatechange = function(resp){
            if (resp.readyState !== 4) return;

            if (resp.status == 429) {
                f({reply: `You have to wait.\n${resp.response?.message ?? ""}`});
                return;
            } else if (resp.status == 413) {
                f({reply: `Ooohhh that's way too much for me!\n${resp.response?.message ?? ""}` });
                return;
            } else if (resp.status >= 400) {
                f({reply: `Something went wrong!\n${resp.response?.message ?? ""}`});
                return;
            }

            const reviewMessage = resp.response?.review;
            if(!reviewMessage) {
                f({reply: "I got no response from the server, I think something went wrong."});
                return;
            }
            f({reply: reviewMessage });
        };
        GM_xmlhttpRequest(req);
    }

    function showReviewDialog(fGetSnippets) {

        const dlgId = 'dlgKatauthor';
        jQuery(`#${dlgId}`).remove();
        jQuery('body').append(`
    <div id='${dlgId}' title='Katauthor Review'>
      <div id="pnlKatauthor" class='codot_panel'>
        <p>I can review code of your snippets for conformance with Codewars authoring guidelines. Do you want me to try?</p>
        <button id='btnKatauthorReview'>Yeah, go ahead</button>
        <div id='katauthorReply' class='markdown prose'></div>
      </div>
    </div>`);

        jQuery('#btnKatauthorReview').button().on("click", function() {
            let helpOutput = jQuery('#katauthorReply');
            helpOutput.text('');
            const snippets = fGetSnippets();
            sendAuthorReviewRequest(snippets, function(e){
                const { reply } = e;
                helpOutput.html(marked.parse(reply));
            });
            //setTimeout(() => { clearInterval(noisesTimer); f({reply: "This is a faked answer"}); }, 10000);
        });
        const dlg = jQuery('#' + dlgId).dialog({
            autoOpen: true,
            height: 600,
            width: '80%',
            modal: true,
            buttons: [
                {
                    text: "Close",
                    click: function() {
                        jQuery(this).dialog("close");
                    }
                }
            ]
        })
    }


    function showEditorReviewDialog() {

        function fGetSnippets() {
            const cmDescription = jQuery('#write_descriptionTab .CodeMirror')[0].CodeMirror.getValue();
            const cmCompleteSolution = jQuery('#code_answer .CodeMirror')[0].CodeMirror.getValue();
            const cmSolutionStub = jQuery('#code_setup .CodeMirror')[0].CodeMirror.getValue();
            const cmSubmissionTests = jQuery('#code_fixture .CodeMirror')[0].CodeMirror.getValue();
            const cmExampleTests = jQuery('#code_example_fixture .CodeMirror')[0].CodeMirror.getValue();
            const cmPreloaded = jQuery('#code_package .CodeMirror')[0].CodeMirror.getValue();

            const snippets = {
                description:      cmDescription,
                completeSolution: cmCompleteSolution,
                solutionStub:     cmSolutionStub,
                submissionTests:  cmSubmissionTests,
                exampleTests:     cmExampleTests,
                preloaded:        cmPreloaded
            };
            return snippets;
        }

        showReviewDialog(fGetSnippets);
    }

    function showForkReviewDialog() {

        function fGetSnippets() {
            const cmDescription = jQuery('#code_snippet_description').parent().find('.CodeMirror')[0].CodeMirror.getValue();
            const cmCompleteSolution = jQuery('#code_snippet_code_field .CodeMirror')[0].CodeMirror.getValue();
            const cmSolutionStub = jQuery('#code_snippet_setup_code_field .CodeMirror')[0].CodeMirror.getValue();
            const cmSubmissionTests = jQuery('#code_snippet_fixture_field .CodeMirror')[0].CodeMirror.getValue();
            const cmExampleTests = jQuery('#code_snippet_example_fixture_field .CodeMirror')[0].CodeMirror.getValue();
            const cmPreloaded = jQuery('#code_snippet_package_field .CodeMirror')[0].CodeMirror.getValue();

            const snippets = {
                description:      cmDescription,
                completeSolution: cmCompleteSolution,
                solutionStub:     cmSolutionStub,
                submissionTests:  cmSubmissionTests,
                exampleTests:     cmExampleTests,
                preloaded:        cmPreloaded
            };
            return snippets;
        }
        showReviewDialog(fGetSnippets);
    }

    function setupEditorReview() {
        jQuery('#delete').after("<li id='review_author_li'><a id='review_author_a'>🤖 Review</a></li>");
        jQuery('#review_author_a').on("click", function() {
            showEditorReviewDialog();
        });
    }

    function setupForkReview() {

        let pathElems = window.location.pathname.split('/');
        let kataId    = pathElems[2];
        let language  = pathElems[4] ?? 'unknown';
        let userId    = App.instance.currentUser.id;
        let what1     = pathElems[1];
        let what2     = pathElems[3];

        let forkedKata = what1 == 'kata' && what2 == 'fork';
        let forkedTranslation = what1 == 'kumite' && kataId == 'new';
        console.info(forkedKata + ' ' + forkedTranslation);
        if(!forkedKata && !forkedTranslation)
            return;

        jQuery('#validate_btn').parent().before("<li class='mr-15px'><a id='review_fork_a' class='btn'>🤖 Review</a></li>");
        jQuery('#review_fork_a').on("click", function() {
            showForkReviewDialog();
        });
    }

    let marker = null;
    $(document).arrive('#description_area', {existing: true, onceOnly: false}, function(elem) {

        let descriptionArea = jQuery(elem);
        let wrapper = jQuery(descriptionArea.children()[0]);
        let wrapped = wrapper.children();
        let tabBar = jQuery(wrapped[0]);
        let tabContainer = jQuery(wrapped[1]);

        let cwButtonDivs = tabBar.children();
        let cwContentDivs = tabContainer.children();
        let cwButtonsCount = cwContentDivs.length;
        let btnRestore = cwButtonDivs.last();

        btnRestore.before('<div id="codot-btn-help"  ><a class="inline-block px-4 py-2 rounded-lg">🤖 Help</a><div>');
        btnRestore.before('<div id="codot-btn-lint"  ><a class="inline-block px-4 py-2 rounded-lg">🤖 Lint</a><div>');
        btnRestore.before('<div id="codot-btn-review"><a class="inline-block px-4 py-2 rounded-lg">🤖 Review</a><div>');

        tabContainer.append('<div id="codot-pnl-help"   class="codot_panel prose md:h-full" style="display: none;"></div>');
        tabContainer.append('<div id="codot-pnl-lint"   class="codot_panel       md:h-full" style="display: none;"></div>');
        tabContainer.append('<div id="codot-pnl-review" class="codot_panel prose md:h-full" style="display: none;"></div>');

        let allButtonDivs  = tabBar.children();
        let allContentDivs = tabContainer.children();
        let codotElems = [
            ["#codot-btn-help",   "#codot-pnl-help"  ],
            ["#codot-btn-lint",   "#codot-pnl-lint"  ],
            ["#codot-btn-review", "#codot-pnl-review"]
        ];

        codotElems.forEach(([btnid, pnlid]) => {
            jQuery(btnid).children('a').on("click", function() {
                allButtonDivs.children('a').removeClass("text-ui-active-tab-text bg-ui-active-tab-bg");
                allContentDivs.hide();
                jQuery(btnid).children('a').addClass("bg-ui-active-tab-bg text-ui-active-tab-text");
                jQuery(pnlid).show();
            });
        });

        cwButtonDivs.children('a').each((idx, btn) => {
            jQuery(btn).on("click", function() {
                codotElems.forEach(([btnid, pnlid]) => {
                    jQuery(btnid).children('a').removeClass("text-ui-active-tab-text bg-ui-active-tab-bg");
                    jQuery(pnlid).hide();
                });
            });
        });

        setupHelpPanel(function(helpResult) {
            jQuery('#codot-help-reply').html(marked.parse("Here's what I found:\n\n" + helpResult.reply));
        });

        setupLinterPanel(function(lintResult) {
            let { reply, lintItems } = lintResult;
            if(reply) {
                jQuery('#codot-lint-reply').text(reply);
            }
            if(lintItems) {
                let replyDiv = jQuery('#codot-lint-reply');
                replyDiv.append('<ol id="lintsList" style="list-style-type: decimal; list-style-position: inside"></ol>');
                let itemsList = jQuery('#lintsList');
                let cm = jQuery('#code .CodeMirror')[0].CodeMirror;
                let getMarkerPos = function(msg) {
                    let { line, col, endLine, endColumn } = msg;
                    if(!line) return null;
                    line = Math.max(0, (line ?? 0) - 1);
                    col = Math.max(0, (col ?? 0) - 1);
                    endLine = endLine ? endLine - 1 : line;
                    endColumn = endColumn ? endColumn - 1 : null;
                    return { from: { line, ch: col}, to: { line: endLine, ch: endColumn} };
                }
                lintItems.forEach((msg, idx) => {
                    itemsList.append(`<li>${msg.message} (<a target='_blank' href='${msg.ruleLink}'>${msg.ruleId}</a>) <a id='lint-msg-${idx}'>🔦</a></li>`);
                    jQuery('#lint-msg-' + idx).on("click", msg, function(e) {
                        let msg = e.data;
                        let markPos = getMarkerPos(msg);
                        if(markPos) {
                            cm.scrollIntoView(markPos.from);
                        }
                    });
                    jQuery('#lint-msg-' + idx).on("mouseenter", msg, function(e) {
                        marker?.clear();
                        let msg = e.data;
                        let markPos = getMarkerPos(msg);
                        if(markPos) {
                            marker = cm.getDoc().markText(markPos.from, markPos.to, {css: "text-decoration: spelling-error wavy red"});
                        }
                    });
                    jQuery('#lint-msg-' + idx).on("mouseleave", msg, function(e) {
                        marker?.clear();
                    });
                });
            }
        });
        setupReviewPanel(function(reviewResult) {
            jQuery('#codot-review-reply').html(marked.parse(reviewResult.reply));
        });
    });


    $(document).arrive('#delete', {existing: true, onceOnly: false}, function(elem) {
        setupEditorReview();
    });

    $(document).arrive('#validate_btn', {existing: true, onceOnly: false}, function(elem) {
        setupForkReview();
    });

})();
