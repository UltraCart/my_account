var templates = {};

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

  loadSettings();
}


function loadSettings() {
  var html = '';

  //noinspection JSUnusedLocalSymbols
  ultracart.myAccount.getSettings({
    success: function (settings) {
      html = 'We are sorry. Your settings could not be loaded at this time.';
      if (settings) {
        html = templates.settings(settings);
//        console.log(html);
      }
      jQuery('#settings').html(html);
      bindFields();
    }
  });

}

function updateSettings() {
  clearAllMessages();

  // validate the fields
  var email = jQuery.trim(jQuery('#email').val());
  var merchantId = jQuery.trim(jQuery('#merchantId').val());
  var customerProfileOid = jQuery.trim(jQuery('#customerProfileOid').val());

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
  var fax = jQuery.trim(jQuery('#fax').val());
  var taxId = jQuery.trim(jQuery('#taxId').val());

  if (!email) {
    showError("Your email is a required field.");
    return;
  }


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

  var changes = {
    merchantId: merchantId,
    customerProfileOid: customerProfileOid == '' ? -1 : parseInt(customerProfileOid),
    email: email,
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
    eveningPhone: eveningPhone,
    taxId: taxId,
    fax: fax
  };

  ultracart.myAccount.updateSettings(changes, {
    success: function () {
      showSuccess("Your changes were saved.");
    },
    failure: function (jqXHR) {
      var errorMsg = null;
      if (jqXHR && jqXHR.getResponseHeader) {
        errorMsg = jqXHR.getResponseHeader('UC-REST-ERROR');
      }
      if (errorMsg) {
        showError("Save failed with this error: " + errorMsg);
      } else {
        showError("Your settings could not be saved at this time.  Please try again later.");
      }

    }
  });


}


function bindFields() {
  jQuery('#cancelButton').unbind().bind('click', function () {
    window.history.back();
  });

  jQuery('#saveButton').unbind().bind('click', updateSettings);

}


jQuery(document).ready(function () {
  enablePleaseWaitMessage();
  templates.settings = Handlebars.compile(jQuery('#settings-template').html());
  initialize();

});
