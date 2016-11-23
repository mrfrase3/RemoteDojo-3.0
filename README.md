# RemoteDojo-3.0 #
A re-code of Remote Dojo

----------
## Installation ##
Pretty simple!

 1. Download the repo to your test directory
 2. Run `npm install`
 3. Place your SSL certificate files into the certs folder, naming them server.key and server.crt . Alternatively make self signed certificates by running `sudo bash ./sscerts.sh <domain>` where you replace `<domain>` with the domain of your server. If you are running on a local machine, you can just use `sudo bash ./sscerts.sh localhost`. If using this method, ensure openssl is installed on your system.
 4. Run `node app.js`

## Configuration ##
Settings can be found in `config.json`.

| Setting               | Information                                                                      |
|-----------------------|----------------------------------------------------------------------------------|
| runInDemoMode         | Set to `true` if you want to run the server in demo mode                         |
| demoDuration          | The duration (in ms) that a demo session will last                               |
| sessionSecret         | The session's secret for express sessions                                        |
| serverPort            | The port that the server runs on                                                 |
| feedbackLink          | A link where users post feedback                                                 |

## Extensions ##

In order to screen share, the client currently requires an extension.

**For Chrome:**
The extension can be installed [from the webstore.](https://chrome.google.com/webstore/detail/screen-capturing/ajhifddimkapgcifgcodmmfdlknahffk)
[Click Here](https://github.com/muaz-khan/Chrome-Extensions/tree/master/desktopCapture) for the source code.

**For Firefox:**
If you are using localhost/127.0.0.1 adresses, you can just install the [addon here.](https://addons.mozilla.org/en-US/firefox/addon/enable-screen-capturing/)
Otherwise, if you are using a remote server, you must compile your own addon with a list of accepted ip/domains that you own. You can find the [source and further instructions here.](https://github.com/muaz-khan/Firefox-Extensions/tree/master/enable-screen-capturing)

**Other Browsers:**
Other Browsers do not currently support screen sharing, please download and install chrome/firefox.

## Adding, modifying, or removing users

With the server running, users may be modified by an admin account. By default, this account has username 'admin' and password 'tomato'. Once logged in as admin you can select a type of account and a specific user or dojo to modify. Any field left blank will go unchanged. A default user of each role exists by default, with username the same as their role (i.e. ‘dojo’, ‘mentor’, ‘champion’ or ‘admin’), and password 'tomato'.

To add a new user, select the user type, then select the 'Add a new user' option from the dropdown menu. Usernames are unique, case insensitive and cannot be modified once set. Fields left blank and will be set to an empty string.

Admins may delete any account except their own. Simply select the user and press the remove button.

Each user type stores a username (or dojoname), a password, and various contact details.

Admins and champions are treated as trusted by the server. As such, any errors in the form must be checked manually before submission.
