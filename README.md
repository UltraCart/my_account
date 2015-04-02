my_account
==========

Version 1.0
===========

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

Getting Started
===============
Begin with myaccount_rest_X.X.js  (initial version was myaccount_rest_1.0.js)
The first few lines contain settings to make the portal operational.
Here are those lines:

// relative or absolute.  it doesn't matter.  this file must exist on your server.
var pathToProxy = '/my_account/rest_proxy.php';  
// set to true if running on your own server.  if hosted by ultracart, set to false. (You'll want this to be true)
var i_am_using_a_proxy = true;  

// you shouldn't change this.
var restUrl = i_am_using_a_proxy ? pathToProxy + '?_url=/rest/myaccount' : '/rest/myaccount';  


var merchantId = 'DEMO'; // you should change this.


Change Log
===============
v0.5 - Initial version
v0.6 - Added 'register new account' feature on main page.


Demo
====
https://secure.ultracart.com/merchant/integrationcenter/my_account_demo/index.html

MyAccount REST API
==================
Coming Soon
