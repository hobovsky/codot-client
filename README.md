# Codot Client

This is a userscript client for the Codot AIssistant.

## What is Codot?

Codot is short for **Cod**ewars B**ot**. It's a GPT-powered assistant designed to help users of the Codewars platform as they embark on their journey with Codewars kata.

## Installation

The Codot frontend is a userscript compatible with [Tampermonkey](https://www.tampermonkey.net). To install it, you need to first install the [Tampermonkey extension](https://www.tampermonkey.net) for your browser. Then, add the [Codot userscript](https://github.com/hobovsky/codot-client/raw/main/src/codot.user.js) to your Tampermonkey library. Refresh the Codewars page after installing the script.

## How to Use

Codot activates when you are training on a Codewars challenge and your tests (either sample tests or a submission attempt) end in failure.

![How to Use Step 1](./images/howto-00.png)

After clicking the icon, you will be presented with the Codot prompt screen:

![How to Use Step 2](./images/howto-01.png)

For the first use, you need to paste your Codewars user ID. If you're unsure how to find it, you can locate it on your Codewars [Account Settings](https://www.codewars.com/users/edit) page.

After confirming your request for help, Codot will take some time to think and will then present you with an answer:

![How to Use Step 3](./images/howto-02.png)

Please note that the bot's intelligence is artificial, so figuring out the answer may take some time - around 10 seconds of intensive thinking.

### Limits

During the initial testing phase, there is a limit of 1 query per minute and a maximum of 5 queries per hour for a single user ID. These limits may be increased after the initial testing phase.

To minimize spoilers, Codot does not answer questions about kata ranked higher than 6 kyu or beta kata.

Codot may become confused if used concurrently in more than one tab or browser. It's important to issue queries from the same tab that was used for the most recent test run of the training user.

## Note on Availability

Currently, Codot utilizes my private OpenAI quota and a free hosting service. It's possible that my API quotas could be exhausted at any time, or that my billing plan could run out, or that the service could go down without my notice, or that I may decide to discontinue payment for it. Therefore, there are absolutely no guarantees.
