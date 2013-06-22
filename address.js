var templates = {};
var order = null;
var addressType = '';

// ---------------------------------------------------------
// Security (well, not really security, but a helper to
// redirect the user if they're not logged in.  Security
// is handled by the REST API.
// ---------------------------------------------------------
var redirectToLogin = function () {
  var location_href = "index.html";
  if (location.hash && location.hash.length > 0) {
    location_href += "?hash=" + location.hash.substring(1);
  }
  location.href = location_href;
};

var theDocument = jQuery(document);
// ajaxSend isn't need.  authentication is done via cookies that should already be present with every request.
//theDocument.ajaxSend(function (event, xhr) {
//    var authToken = $.cookie('access_token');
//    if (authToken) {
//        xhr.setRequestHeader("Authorization", "Bearer " + authToken);
//    }
//});

theDocument.ajaxError(function (event, xhr) {
  if (xhr.status == 401)
    redirectToLogin();
});


jQuery.ajaxSetup({ cache: false });

function initialize() {

  // find the address type and address id (if edit).
  var params = uc.commonFunctions.parseHttpParameters();
  if (params['type'] && params['type'].length) {
    addressType = params['type'][0];
  } else {
    addressType = 'shipping';  // not ideal to default like this. but for a new page it will work out.
  }

  var id = null;
  if (params['id'] && params['id'].length) {
    id = params['id'][0];

  }

  loadAddress(id);
}


function loadAddress(id) {
  var html = '';

  if (id) {
    var functionName = addressType == 'shipping' ? 'getShippingAddress' : 'getBillingAddress';

    //noinspection JSUnusedLocalSymbols
    ultracart.myAccount[functionName](id, {
      success: function (address) {
        html = 'This address could not be found at this time.';
        if (address) {
          address.isBilling = addressType == 'billing';
          html = templates.address(address);
//        console.log(html);
        }
        jQuery('#address').html(html);
        bindFields();
      }
    });

  } else {
    html = templates.address({isBilling: addressType == 'billing'});
    jQuery('#address').html(html);
    bindFields();
  }
}

function updateAddress() {
  clearAllMessages();

  // validate the fields
  var id = jQuery.trim(jQuery('#id').val());
  var company = jQuery.trim(jQuery('#company').val());
  var firstName = jQuery.trim(jQuery('#firstName').val());
  var lastName = jQuery.trim(jQuery('#lastName').val());
  var address1 = jQuery.trim(jQuery('#address1').val());
  var address2 = jQuery.trim(jQuery('#address2').val());
  var city = jQuery.trim(jQuery('#city').val());
  var state = jQuery.trim(jQuery('#state').val());
  var postalCode = jQuery.trim(jQuery('#postalCode').val());
  var country = jQuery.trim(jQuery('#country').val());
  var title = jQuery.trim(jQuery('#title').val());
  var dayPhone = jQuery.trim(jQuery('#dayPhone').val());
  var eveningPhone = jQuery.trim(jQuery('#eveningPhone').val());

  if (!firstName) {
    showError("First Name is a required field.");
    return;
  }

  if (!lastName) {
    showError("Last Name is a required field.");
    return;
  }

  if (!address1) {
    showError("Address 1 is a required field.");
    return;
  }

  if (!city) {
    showError("City is a required field.");
    return;
  }

  if (!state) {
    showError("State is a required field.");
    return;
  }

  if (!postalCode) {
    showError("Postal Code is a required field.");
    return;
  }

  if (!country) {
    showError("Country is a required field.");
    return;
  }

  var functionName = addressType == 'shipping' ? 'insertShippingAddress' : 'insertBillingAddress';
  if (id) {
    functionName = addressType == 'shipping' ? 'updateShippingAddress' : 'updateBillingAddress';
  }

  var account = {
    id: id == '' ? 0: parseInt(id),
    company: company,
    firstName: firstName,
    lastName: lastName,
    address1: address1,
    address2: address2,
    city: city,
    state: state,
    postalCode: postalCode,
    country: country,
    title: title,
    dayPhone: dayPhone,
    eveningPhone: eveningPhone
  };

  ultracart.myAccount[functionName](account, {
    success:function(address){
      showSuccess("Your changes were saved.  Press back on your browser to return to your address book.");
      jQuery('#id').val(address.id); // set the id so subsequent saves are updates.

    },
    failure:function(jqXHR){
      var errorMsg = null;
      if(jqXHR && jqXHR.getResponseHeader){
        errorMsg = jqXHR.getResponseHeader('UC-REST-ERROR');
      }
      if(errorMsg){
        showError("Save failed with this error: " + errorMsg);
      } else {
        showError("Your address could not be saved at this time.  Please try again later.");
      }

    }
  });


}


function bindFields() {
  jQuery('#cancelButton').unbind().bind('click', function () {
    window.history.back();
  });

  jQuery('#saveButton').unbind().bind('click', updateAddress);

}


jQuery(document).ready(function () {
  enablePleaseWaitMessage();
  templates.address = Handlebars.compile(jQuery('#address-template').html());
  initialize();

});
