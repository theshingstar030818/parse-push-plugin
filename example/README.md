Rebuild the ionic-testpn example app.
------------------------------------

In the ionic-testpn directory, do:

```bash

# restore required node tool chain
npm update --dev

# restore ionic platforms and base plugins
ionic state restore

# restore bower dependencies
bower update

# install the plugin with your sender id
ionic plugin add ../../ --variable GCM_SENDER_ID=1234567

```

Now go to config.xml and change your `ParseServerUrl` preference.
