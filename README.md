# RemoteDojo-3.0 #
A re-code of Remote Dojo, because why not?


----------
## Installation ##
Pretty simple!

 1. Download the repo to your test directory
 2. run `npm install`
 3. place your SSL certificate files into the certs folder, naming them server.key and server.crt . Alternatively make self signed certificates by running `sudo bash ./sscerts.sh <domain>` where you replace `<domain>` with the domain of your server. If you are running on a local machine, you can just use `sudo bash ./sscerts.sh localhost`
 4. run `node app.js`

Notes:

 - If you are using the sscerts.sh, make sure you are running it as either root or a user that has sudo privileges. Also make sure openssl is installed on your system.
 - Default logins for everything is 'tomato' with the dojo login name being 'dojo', the mentor username being 'mentor', champion username being 'champion', and the admin username being 'admin'

## Configuration ##
Settings can be found in `config.json`.

| Setting               | Information                                                                      |
|-----------------------|----------------------------------------------------------------------------------|
| runInDemoMode         | Set to `true` if you want to run the server in demo mode                         |
| demoDuration          | The duration (in ms) that a demo session will last                               |
| sessionSecret         | The session's secret for express sessions                                        |
| serverPort            | The port that the server runs on                                                 |

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
