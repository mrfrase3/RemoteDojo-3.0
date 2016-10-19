# RemoteDojo-3.0 #
The new version of RemoteDojo. A better designed, more stable and more robust version of the original.

See INSTALL.md for installation instructions.

# Authors
Technical Lead: Fraser Bullock
Other Developers: Emma Krantz, Jye Dewar, Tim Davies
Testers: Ishraq Bari, Tahmer Hijawi
Landing Page: Cikang "Kevin" Li

# Files
- certs/
  - SSL certificates
- common/
  - Images, CSS and Javascript files that are sent to the browser from the server
- lib/
  - External libraries
- resources/
  - HTML files
- sessions/
  - Temporary files to keep track of user sessions
- test/
  - Source files for automated tests
- app.js
  - Main server code.
- users.json, dojos.json
  - User/Dojo database file
- users_copy.json, dojos_copy.js
  - Backup of default user/Dojo database file
- config.json
  - Server configuration file
- Gruntfile.js
  - Configuration for automated testing
- sshcerts.sh
  - Run this script to generate SSL certificates
