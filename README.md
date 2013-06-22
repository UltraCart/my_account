my_account
==========

Version 0.5 BETA

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


Demo
====
Coming Soon

MyAccount REST API
==================
Coming Soon
