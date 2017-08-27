# RemoteDojo-3.0 #
A re-code of Remote Dojo

----------
## Installation ##
Pretty simple!

 1. Download the repo to your test directory
 2. Run `npm install`
 3. Setup your Https method, see the "HTTPS" section bellow.
 4. Edit the `config.json` file to suit your setup. Change the mongodb details if you dont want to use the test database.
 5. Run `node app.js`

### Initial Admin Login ###
When the server starts, it will check if there are any administrator accounts, if there are none (like the first time you start the server) a new admin account is created and the detailts are output to the console, it should look like the following:
```
Server Started on port: 4000
Super Admin created:
  username: superadmin
  password: password0123456789abcdef
```
You may want to change the password or create a new admin account and then delete this one from the admin page in the application. If you forget or loose the password, you will need to go into the mongo database and delete the user document and then generate the sure user again.

## Configuration ##
Settings can be found in `config.json`.

| Setting                 | Information                                                                      |
|-------------------------|----------------------------------------------------------------------------------|
| runInDemoMode           | Set to `true` if you want to run the server in demo mode                         |
| demoDuration            | The duration (in ms) that a demo session will last                               |
| sessionSecret           | The session's secret for express sessions                                        |
| feedbackLink            | A link where users post feedback                                                 |
| server.http.enabled     | whether to run a http server, if https is also true, it will just reditect http connections to the https server. This option is ignored and assumed true if https is false. |
| server.http.port        | port to run the http webserver on.                                               |
| server.https.enabled    | whether to run a https server.                                                   |
| server.https.port       | port to run the https webserver on.                                              |
| server.https.cert       | file location of the ssl certificate.                                            |
| server.https.key        | file location of the ssl key.                                                    |
| database.mongo.host     | hostname of the mongodb server                                                   |
| database.mongo.port     | port of the mongo server                                                         |
| database.mongo.name     | name of the mongo database                                                       |
| database.mongo.user     | username of the mongo server user                                                |
| database.mongo.password | password of the mongo server user                                                |

Note: The default configuration has the testing mongo database configuration, this must be changed before use in production.

## HTTPS ##

Https is required by most browsers in order to enable a large number of the features, including accessing the microphone, webcam and screen sharing. There are a few ways to go about this:

### Let's Encrypt ###
Although this application doesn't support [Let's Encrypt](https://letsencrypt.org/) natively, it is rather straight forward to setup a Let's Encrypt Http Proxy using something like [RedBird](https://github.com/OptimalBits/redbird). It is probably recommended to set this up for use in production.

### SSL Certificates ###
If you have SSL certs, you can add them easily.

You can place your SSL certificate files into the certs folder, naming them key.pem and cert.pem (or define it in the config.json). 

Alternatively make self signed certificates by running `sudo bash ./sscerts.sh <domain>` where you replace `<domain>` with the domain of your server. If you are running on a local machine, you can just use `sudo bash ./sscerts.sh localhost`. If using this method, ensure openssl is installed on your system. Note that self signed certificates are **not secure**, and the browsers will kick up a fuss about them.

## Extensions ##

In order to screen share, the client currently requires an extension.

**For Chrome:**
The extension can be installed [from the webstore.](https://chrome.google.com/webstore/detail/screen-capturing/ajhifddimkapgcifgcodmmfdlknahffk)
[Click Here](https://github.com/muaz-khan/Chrome-Extensions/tree/master/desktopCapture) for the source code.

**For Firefox:**
Firefox now supports screen sharing on their stable releases (52+). No extension is required.

**Other Browsers:**
Other Browsers do not currently support screen sharing, please download and install chrome/firefox.

## Adding, modifying, or removing users

With the server running, users may be modified by an admin account. By default, this account has username `superadmin` with the password given in console on first launch. Once logged in as admin you can select a type of account and a specific user or dojo to modify. Any field left blank will go unchanged.

You must initially setup users and dojos.

To add a new user, select the user type, then select the 'Add a new user' option from the dropdown menu. Usernames are unique, case insensitive and cannot be modified once set. Fields left blank and will be set to an empty string.

Admins may delete any account except their own. Simply select the user and press the remove button.

Each user type stores a username (or dojoname), a password, and various contact details.
