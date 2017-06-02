#### my_account

###### Working Demo
A [demo of UltraCart MyAccount](http://secure.ultracart.com/merchant/integrationcenter/my_account_demo/index.html) shows the basic screens.  The problem with running the demo is that the data on it is quickly mangled by visitors, so there's little use in providing a canned login.  It only lasts a few hours.  Do not pull this demo down to use.  It has been modified to run on the UltraCart server.  Download the latest version directly from github.

###### Getting Started
1. Download the latest revision.
2. Edit the file [js/myaccount_rest_1.4.js] and set the variables at the top.
3. ~~Make sure you install and test out the rest_proxy.php script, or nothing will work.~~
4. ~~Test rest_proxy.php by typing the full path to it (wherever you put it) in your web browser address bar.~~  

#### Changelog

###### Version 2.1
* Removed rest_proxy.php
* Enabled CORS support
* This version will run on any web server.

###### Version 2.0
This is a mandatory update.  After July 15, 2015, any site without Hosted Fields will have a broken Payment edit screen.
* PCI 3.0 Support using [UltraCart Hosted Fields](http://docs.ultracart.com/display/ucdoc/UltraCart+Hosted+Credit+Card+Fields).
* Product Review screen is now part of the client.
* Wishlist support

###### Version 1.0
Of this release, the changes in the rest_proxy.php script are most important.
Please upgrade your rest_proxy.php scripts as soon as possible.  Doing so will prevent issues with your site.  Additionally,
we've added a proxy version header that will allow us to track which merchants might have out of date proxy scripts in the
future.  This could prove vital to rapidly addressing any compatibility issues that might arise from future server updates.

rest_proxy.php changes:
* Fixes for content-length being sent down when original response was gziped.  Would cause the client problem if the server running the proxy wasn't gziping it as well
* We have disabled gzip upstream until 4/15/2015 at which point everyone should have their proxy scripts upgraded.
* Added a flag that can be set to enable debugging to the error_log instead of having to uncomment all the statements.
* Change SSL certificate verify flag.
* Set an empty Expect header in the request to prevent curl from sending the Expect: 100-Continue header.
* Simplify the HTTP 100 Continue header trimming and allow for multiple of them
* Close out the curl handle sooner.
* Add a proxy version number to the header so we can tell from the server side if people are running out of date proxy


Version 0.6 BETA

Customer Portal for UltraCart merchants

This is a reference implementation for the new (as of June 2013) Customer Portal for UltraCart sites.  
This portal will allow your customers to login, view order history, submit product reviews, manage
addresses and credit cards, and submit feedback to you (case management).

Change Log
===============
v0.5 - Initial version
v0.6 - Added 'register new account' feature on main page.
