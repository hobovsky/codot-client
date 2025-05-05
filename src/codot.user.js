// ==UserScript==
// @name         Codot AIsisstant
// @namespace    codot.cw.hobovsky
// @version      0.1.6
// @description  Client facade for the Codot bot.
// @author       hobovsky
// @updateURL    https://github.com/hobovsky/codot-client/raw/main/src/codot.user.js
// @downloadURL  https://github.com/hobovsky/codot-client/raw/main/src/codot.user.js
// @match        https://www.codewars.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=codewars.com
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_setClipboard
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

    hr.katafix-form {
      margin: 1em
    }
`;
    GM_addStyle(css);

    function getJsonResponse(resp) {
        return resp.status < 400 ? resp.response : JSON.parse(resp.responseText);
    }
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
            _url: 'http://localhost:3000' + route,
            url: 'https://codot-server.fly.dev' + route,
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
        "Is this variable unused?",
        "Inconsistent coding style spotted.",
        "Is this fragment copy/pasted?",
        "This code looks familiar...",
        "This code is not SOLID enough.",
        "This code is not DRY enough.",
        "Is this a global variable?",
        "Did anyone test this?",
        "Are these variable names meaningful enough?",
        "I'm not sure what this function is supposed to do.",
        "Is this error handling sufficient?",
        "Does this function need to be this long?",
        "I'm not entirely clear on the purpose of this block.",
        "I'm not confident about the logic in this section.",
        "I'm not entirely sure about this algorithm.",
        "Does this code follow best practices?",
        "I'm not entirely convinced by this design.",
        "Are these variables being used correctly?",
        "I think this code be simplified.",
        "There must a way to refactor this.",
        "Did anyone even test this?",
        "Is this algorithm overly complex?",
        "I think this code is not portable.",
        "Whys is this code so complex?",
        "I'm not entirely sure about the intent of this code.",
        "I'm unsure about the correctness of this logic.",
        "Are the global variables necessary?",
        "Should these variables be more descriptive?",
        "I'm not entirely convinced by the choice of algorithm.",
        "Magic numbers are bad",
        "Uncle Bob would be proud."
    ];

    function setupHelpPanel(f) {
        jQuery('#codot-pnl-help').append(`
        <p>When your tests fail, I can take a look at your solution and help you with failed tests. Do you want me to try?</p>
        <button id='codot-help'>Yeah, go ahead</button>
        <div><ul id='codot-help-noises' class='not-prose' style='list-style: none'></ul></div>
        <div id='codot-help-reply'></div>
        `);
        jQuery('#codot-help').button().on("click", function() {
            let helpOutput = jQuery('#codot-help-reply');
            let helpNoises = jQuery('#codot-help-noises');
            jQuery('#help-copy-markdown').remove();
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
                helpNoises.empty();

                const msgResp = getJsonResponse(resp)?.message ?? "";

                if (resp.status == 429) {
                    f({reply: `You have to wait.\n${msgResp}`});
                    return;
                } else if (resp.status == 413) {
                    f({reply: `Ooohhh that's way too much for me!\n${msgResp}` });
                    return;
                } else if (resp.status >= 400) {
                    f({reply: `Something went wrong!\n${msgResp}`});
                    return;
                }

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
                helpNoises.append(`<li>${noise}</li>`);
            }, 1500);
        });
    }

    function setupReviewPanel(f) {
        jQuery('#codot-pnl-review').append(`
        <p>I can perform a review of your code. Do you want me to try?</p>
        <button id='codot-review'>Yeah, go ahead</button>
        <div><ul id='codot-review-noises' class='not-prose' style='list-style: none'></ul></div>
        <div id='codot-review-reply'></div>
        `);
        jQuery('#codot-review').button().on("click", function() {
            let reviewOutput = jQuery('#codot-review-reply')
            let reviewNoises = jQuery('#codot-review-noises');
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
                reviewNoises.empty();

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
                reviewNoises.append(`<li>${noise}</li>`);
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

                const jsonResp = getJsonResponse(resp);
                if (resp.status == 429) {
                    f({reply: `You have to wait.\n${jsonResp.message ?? ""}`});
                    return;
                } else if (resp.status == 413) {
                    f({reply: `Ooohhh that's way too much for me!\n${jsonResp.message ?? ""}` });
                    return;
                } else if (resp.status >= 400) {
                    f({reply: `Something went wrong!\n${jsonResp.message ?? ""}`});
                    return;
                }

                const lintItems = jsonResp.lintItems;
                if(!lintItems) {
                    f({reply: "I got no response from the server, I think something went wrong."});
                    return;
                }
                f({ lintItems });
            };
            GM_xmlhttpRequest(lintReq);
        });
    }

    const codotKatafixStorageKey = "codot.katafix";
    function getActiveTestEditorId() {
        const submissionTestsTab = jQuery('#fixture_tab');
        const exampleTestsTab = jQuery('#example_fixture_tab');
        const editorId = submissionTestsTab.hasClass('is-active') ? '#code_snippet_fixture_field'
        : exampleTestsTab.hasClass('is-active') ? '#code_snippet_example_fixture_field'
        : null;
        return editorId;
    }

    function getActiveTestsCode() {
        const editorId = getActiveTestEditorId();
        return editorId ? jQuery(`${editorId} .CodeMirror`)[0].CodeMirror.getValue() : '';
    }

    function setActiveTestsCode(code) {
        const editorId = getActiveTestEditorId();
        if(editorId)
            jQuery(`${editorId} .CodeMirror`)[0].CodeMirror.setValue(code);
    }
    function setupFixPanel(f) {

        let language = jQuery('#languages > dl > dd.is-active').data('language');

        jQuery('#katafix-pnl-fix').append(`
        <p>I can refactor tests for you. Enter a list of changes you want me to apply:</p>
        <form method='POST'>
          <textarea id='katafix-fixes-input' rows='8'></textarea>
          <table><tr>
          <td><label for='list_apply_to'>Apply to:</label></td>
          <td><select id='list_apply_to'>
            <option value=''>Currently open tests</option>
            <!-- <option value=''>Example tests</option>
            <option value=''>Complete solution</option>
            <option value=''>Solution setup</option>
            <option value=''>Preloaded</option>
            <option value=''>Description</option> -->
          </select></td>
          <td><input type='button' id='katafix-fix' value='Fix'/></td>
          </tr></table>
          <hr class='katafix-form'/>
          <details open><summary>Example fixes</summary>
              <div id='example_fixes_div'></div>
          </details>
          <hr class='katafix-form'/>
          <details open><summary>Example kata</summary>
             <!-- <label for='list_example_kata'>Use this kata as an example:</label>
             <select id='list_example_kata'>
               <option value='(none)'>(none)</option>
               <option value='53da3dbb4a5168369a0000fe'>Even or Odd</option>
               <option value='526c7363236867513f0005ca'>Leap Years</option>
               <option value='58925dcb71f43f30cd00005f'>Latest Clock</option>
               <option value='(other)'>Other</option>
             </select>
             <label for='example_kata_id'>Kata ID or URL:</label>
             <input type='text' id='example_kata_id' placeholder='(not selected)' disabled/> -->
             <label for='example_test_suite'>Use this test suite as an example:</label>
             <textarea id='example_test_suite' rows='20' class='mb-1'></textarea>
             <p class='mt-1 italic text-xs'>(you can use tests from kata from the <a href='https://www.codewars.com/collections/authoring-examples' target='_blank'>Authoring Examples</a> collection)</p>
          </details>
          <hr class='katafix-form'/>
          <details><summary>Settings</summary>
            <label for='katafix_key'>Your Katafix key:</label>
            <input type='password' id='katafix_key'></input>
          </details>
        </form>
        <hr class='katafix-form'/>
        <div id='katafix-fix-reply'></div>
        `);

        let exampleFixes = [];
        switch(language) {
            case 'javascript':
                exampleFixes.push("Change custom assertions to Chai's <code>`assert`</code> functions (add necessary `require` if missing).");
                exampleFixes.push("Set Chai's <code>`config.truncateThreshold`</code> to 0 (add necessary `require` if missing).");
                exampleFixes.push("Make sure that assertions use failure messages which present a call to solution function with values of inputs.");
                exampleFixes.push("Make sure all variables are declared with `const` or `let`.");
                exampleFixes.push("In fixed tests, factor out `it` to a helper function `test_it` which accepts arguments, `expected`, creates an `it` with a title presenting inputs.");
                exampleFixes.push("Make random tests a single `it` with a loop.");
                exampleFixes.push("Use Lodash' `_.random` instead of `Math.random`.");
                break;
            case 'csharp':
                exampleFixes.push('Change classic asserions to `Assert.That`.');
                exampleFixes.push('Add `[Order]` annotations to test methods.');
                break;
            case 'java':
                exampleFixes.push('Upgrade to JUnit 5 and make test class and test methods package private.');
                exampleFixes.push('Add `@Order` to test methods and `@TestMethodOrder` to test class.');
                exampleFixes.push('Add assertion messages showing the input.');
                exampleFixes.push('Replace usage of `Math.random()` by proper `ThreadLocalRandom` API.');
                exampleFixes.push('Add `@DisplayName` to test methods.');
                break;
            case 'ruby':
                exampleFixes.push('Add describe and it sections to the test code.');
                exampleFixes.push('Make sure that assertions use failure messages which present a call to solution function with values of inputs.');
                exampleFixes.push('Make random tests a single it with a loop.');
                exampleFixes.push("Replace `Test.expect(actual, expect)` with `expect(actual).to eq(expect), 'error message'`.");
                break;
        }

        const examplesDiv = jQuery('#example_fixes_div');
        if(exampleFixes.length) {
          for(const fix of exampleFixes) {
              examplesDiv.append(`<div class='example_fix border-2 border-solid rounded-xl border-gray-200 m-2 p-1 text-sm'>${fix}</div>`);
          }
        } else {
            examplesDiv.text(`(No examples for ${language}, sorry!)`);
        }

        jQuery('.example_fix').on('click', function() {
            const clickedText = jQuery(this).text();
            jQuery('#katafix-fixes-input').val(function(index, currentValue) {
                return currentValue + clickedText + '\n';
            });
        });
/*
        let cmbExamples = jQuery('#list_example_kata');
        let txtExampleId = jQuery('#example_kata_id');
        cmbExamples.on('change', function() {
            let selected = cmbExamples.val();
            switch(selected) {
                case '(none)': {
                    txtExampleId.val('');
                    txtExampleId.prop('disabled', true);
                    break;
                }
                case '(other)': {
                    txtExampleId.prop('disabled', false);
                    break;
                }
                default: {
                    txtExampleId.val(selected);
                    txtExampleId.prop('disabled', true);
                    break;
                }
            }
        });
*/
        const katafixStored = GM_getValue(codotKatafixStorageKey);
        if(katafixStored) {
            jQuery('#katafix_key').val(katafixStored.key || "");
            jQuery('#example_test_suite').val(katafixStored.exampleTestSuite || "");
            jQuery('#katafix-fixes-input').val(katafixStored.fixes || "");
        }

        jQuery('#katafix-fix').button().on("click", function() {
            let fixMsgOutput = jQuery('#katafix-fix-reply');
            fixMsgOutput.text('');

            let pathElems = window.location.pathname.split('/');
            let kataId = '(unknown)', kumiteId = '(unknown)';

            if (pathElems[1] == 'kata') {
                kataId = pathElems[2];
                const kumiteLink = jQuery('#title > div.view > h4 > a').attr('href');
                if(kumiteLink)
                    kumiteId = kumiteLink.split('/')[2];
            } else if (pathElems[1] == 'kumite') {
                kumiteId = pathElems[2];
                kataId = jQuery('#title > div.view > span > a').attr('href').split('/')[2];
            }

            let userCode = getActiveTestsCode();
            if(!userCode)
                return;

            let userId        = App.instance.currentUser.id;
            let fixes         = jQuery('#katafix-fixes-input').val();
            // let exampleKataId = jQuery('#example_kata_id').val();
            let exampleCode   = jQuery('#example_test_suite').val();
            let katafixKey    = jQuery('#katafix_key').val();
            let fixReqData = { kataId, kumiteId, userId, userCode, language, fixes, exampleCode, katafixKey };
            console.info(`Requesting to fix kata ${kataId} kumite ${kumiteId} in language ${language} by user ${userId}`);

            let noisesTimer = undefined;
            let fixReq = getCodotServiceRequestBase('/fix');
            let { onabort } = fixReq;
            fixReq.onabort = function() { clearInterval(noisesTimer); onabort(); };
            fixReq.onerror = function(resp) {
                clearInterval(noisesTimer);
                let msg = "I am sorry, something bad happened, I am unable to help you.";
                if(resp?.error)
                    msg += '\n\n' + resp.error;
                f({reply: msg });
            };
            fixReq.data = JSON.stringify(fixReqData);
            fixReq.onreadystatechange = function(resp){
                if (resp.readyState !== 4) return;
                clearInterval(noisesTimer);

                const fixResp = getJsonResponse(resp);
                if (resp.status == 429) {
                    f({reply: `You have to wait.\n${fixResp.message ?? ""}`});
                    return;
                } else if (resp.status == 413) {
                    f({reply: `Ooohhh that's way too much for me!\n${fixResp.message ?? ""}` });
                    return;
                } else if (resp.status >= 400) {
                    f({reply: `Something went wrong!\n${fixResp.message ?? ""}`});
                    return;
                }

                if(!fixResp) {
                    f({reply: "I got no response from the server, I think something went wrong."});
                    return;
                }

                GM_setValue(codotKatafixStorageKey, {
                    key: jQuery('#katafix_key').val() || "",
                    exampleTestSuite: jQuery('#example_test_suite').val() || "",
                    fixes: jQuery('#katafix-fixes-input').val() || ""
                });
                f(fixResp);
            };
            GM_xmlhttpRequest(fixReq);
            //setTimeout(() => { clearInterval(noisesTimer); f({reply: "This is a faked answer"}); }, 10000);
            noisesTimer = setInterval(() => {
                let noise = noises[Math.random() * noises.length | 0];
                fixMsgOutput.append(`<p>${noise}</p>`);
            }, 1500);
        });
    }

    function sendAuthorReviewRequest(snippets, f) {

        let pathElems = window.location.pathname.split('/');
        let kataId    = pathElems[2];
        let userId    = App.instance.currentUser.id;
        let language  = 'unknown';

         if(jQuery('#language_dd').length) {
             language = jQuery('#language_dd > dl > dd.is-active').data('language');
         } else if(jQuery('#languages').length) {
             language = jQuery('#languages > dl > dd.is-active').data('language');
         }

        const req = getCodotServiceRequestBase('/author_review');
        req.onerror = function(resp) {
            let msg = "I am sorry, something bad happened, I am unable to help you.";
            if(resp?.error)
                msg += '\n\n' + resp.error;
            f({reply: msg});
        };
        req.data = JSON.stringify({ snippets, kataId, language, userId });
        req.onreadystatechange = function(resp){
            if (resp.readyState !== 4) return;

            let jsonResp = getJsonResponse(resp);
            if (resp.status == 429) {
                f({reply: `You have to wait.\n${jsonResp.message ?? ""}`});
                return;
            } else if (resp.status == 413) {
                f({reply: `Ooohhh that's way too much for me!\n${jsonResp.message ?? ""}` });
                return;
            } else if (resp.status >= 400) {
                f({reply: `Something went wrong!\n${jsonResp.message ?? ""}`});
                return;
            }

            const reviewMessage = jsonResp.review;
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
        <p>
          Before you publish your code, I can review your snippets for conformance with Codewars authoring guidelines.
          I am just a bot, but my review can help you find the most common mistakes done by unexperienced authors and translators,
          and save you negative feedback during actual review.
        </p>
        <p>Do you want me to try?</p>
        <p style='color: orange'>NOTE: kata reviews are experimental and reported remarks can be inaccurate. It is strongly recommended to consult them with documentation or Codewars community.</p>
        <button id='btnKatauthorReview'>Yeah, go ahead</button>
        <div id='katauthorReply' class='markdown prose w-full'></div>
      </div>
    </div>`);

        jQuery('#btnKatauthorReview').button().on("click", function() {
            let helpOutput = jQuery('#katauthorReply');
            helpOutput.text('');
            jQuery('#katauthor-copy-markdown').remove();
            const snippets = fGetSnippets();

            if(snippets.problem) {
                helpOutput.text(snippets.problem);
            } else {
                helpOutput.text('Please give me some time while I review your code...');
                sendAuthorReviewRequest(snippets, function(e){
                    const { reply } = e;
                    helpOutput.html(marked.parse(reply));
                    helpOutput.after('<button id="katauthor-copy-markdown">Copy as markdown to clipboard</button>');
                    jQuery('#katauthor-copy-markdown').button().on("click", function() {
                        GM_setClipboard(reply, "text");
                    });
                });
                //setTimeout(() => { clearInterval(noisesTimer); f({reply: "This is a faked answer"}); }, 10000);
            }
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
            const cmDescription      = jQuery('#write_descriptionTab .CodeMirror')[0].CodeMirror.getValue();
            const cmCompleteSolution = jQuery('#code_answer .CodeMirror')[0].CodeMirror.getValue();
            const cmSolutionStub     = jQuery('#code_setup .CodeMirror')[0].CodeMirror.getValue();
            const cmSubmissionTests  = jQuery('#code_fixture .CodeMirror')[0].CodeMirror.getValue();
            const cmExampleTests     = jQuery('#code_example_fixture .CodeMirror')[0].CodeMirror.getValue();
            const cmPreloaded        = jQuery('#code_package .CodeMirror')[0].CodeMirror.getValue();

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

            const descriptionEditor = jQuery('#code_snippet_description').parent().find('.CodeMirror')[0];
            if(!descriptionEditor) {
                return {problem: 'I cannot read the description. I need to see the description panel to be able to read it. Please make the description panel visible and try again.'};
            }
            const cmDescription      = descriptionEditor.CodeMirror.getValue();
            const cmCompleteSolution = jQuery('#code_snippet_code_field .CodeMirror')[0].CodeMirror.getValue();
            const cmSolutionStub     = jQuery('#code_snippet_setup_code_field .CodeMirror')[0].CodeMirror.getValue();
            const cmSubmissionTests  = jQuery('#code_snippet_fixture_field .CodeMirror')[0].CodeMirror.getValue();
            const cmExampleTests     = jQuery('#code_snippet_example_fixture_field .CodeMirror')[0].CodeMirror.getValue();
            const cmPreloaded        = jQuery('#code_snippet_package_field .CodeMirror')[0].CodeMirror.getValue();

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

        if (jQuery('#review_author_a').length)
            return;

        jQuery('#actions').children('ul').first().after("<li id='review_author_li'><a id='review_author_a'>🤖 Review</a></li>");
        jQuery('#review_author_a').on("click", function() {
            showEditorReviewDialog();
        });
    }

    function setupForkReview() {

        if (jQuery('#review_fork_a').length)
            return;

        let pathElems = window.location.pathname.split('/');
        let kataId    = pathElems[2];
        let language  = pathElems[4] ?? 'unknown';
        let userId    = App.instance.currentUser.id;
        let what1     = pathElems[1];
        let what2     = pathElems[3];

        let forkedKata = what1 == 'kata' && what2 == 'fork';
        let forkedTranslation = what1 == 'kumite' && kataId == 'new';
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
            let helpOutput = jQuery('#codot-help-reply');
            let reply = helpResult.reply;
            helpOutput.html(marked.parse("Here's what I found:\n\n" + reply));
            helpOutput.after('<button id="help-copy-markdown">Copy as markdown to clipboard</button><hr/><p>You can visit <code>#help-solve</code> channel of the <a href="https://discord.gg/mSwJWRvkHA" target="_blank">Codewars Discord server</a> for more help!</p>');
            jQuery('#help-copy-markdown').button().on("click", function() {
                GM_setClipboard(reply, "text");
            });
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

    $(document).arrive('#info_area', {existing: true, onceOnly: false}, function(elem) {

        let infoArea = jQuery(elem);
        let wrapper = jQuery(infoArea.children()[0]);
        let wrapped = wrapper.children();
        let tabBar = jQuery(wrapped[0]);
        let tabContainer = jQuery(jQuery(wrapped[1]).find('ul')[0]);

        let cwButtonDivs = tabBar.children();
        let cwContentDivs = tabContainer.children();
        let cwButtonsCount = cwContentDivs.length;
        let btnHelp = cwButtonDivs.last();

        btnHelp.before('<dd id="katafix-btn-fix" class="mb-15px"><a>🤖 Fix</a><div>');
        tabContainer.append(`<li class="is-full-height" data-tab="fix"><div id="katafix-pnl-fix" class="codot_panel prose is-full-height p-15px overflow-auto"></div></li>`);

        let allButtonDivs  = tabBar.children();
        let allContentDivs = tabContainer.children();
        let codotElems = [
            ["#katafix-btn-fix", "#katafix-pnl-fix"]
        ];

        codotElems.forEach(([btnid, pnlid]) => {
            jQuery(btnid).children('a').on("click", function() {
                allButtonDivs.removeClass("is-active");
                allContentDivs.removeClass('is-active');
                // allContentDivs.hide();
                jQuery(btnid).addClass("is-active");
                jQuery(pnlid).parent().addClass('is-active');
                // jQuery(pnlid).show();
            });
        });

        cwButtonDivs.children('a').each((idx, btn) => {
            jQuery(btn).on("click", function() {
                codotElems.forEach(([btnid, pnlid]) => {
                    jQuery(btnid).removeClass("is-active");
                    jQuery(pnlid).removeClass("is-active");
                    // jQuery(pnlid).hide();
                });
            });
        });

        setupFixPanel(function(fixResult) {
            if(fixResult.refactoredTests) {
                setActiveTestsCode(fixResult.refactoredTests);
            }
            let fixMsgOutput = jQuery('#katafix-fix-reply');
            fixMsgOutput.text(fixResult.reply ?? "");
        });
    });


    $(document).arrive('h1.page-title', {existing: true, onceOnly: false}, function(elem) {
        if(elem.textContent != "Kata Editor")
            return;

        setupEditorReview();
    });

    $(document).arrive('#validate_btn', {existing: true, onceOnly: false}, function(elem) {
        setupForkReview();
    });

})();
