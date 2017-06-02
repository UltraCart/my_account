"use strict";
/* globals JSON3,UltraCartHostedFields */
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
theDocument.ajaxSend(function (event, xhr) {

    var cartId = getCookie('UltraCartShoppingCartID');
    var merchantId = window.merchantId || getCookie('UltraCartMerchantID');

    xhr.setRequestHeader("cache-control", "no-cache");
    xhr.setRequestHeader("X-UC-Merchant-Id", merchantId);
    xhr.setRequestHeader("X-UC-Shopping-Cart-Id", cartId);
});

theDocument.ajaxError(function (event, xhr) {
    if (xhr.status === 401)
        redirectToLogin();
});


jQuery.ajaxSetup({cache: false});


// ===============================================================================
//  BEGIN PCI 3.0 compliance code
//  What you might need to change:
//     the selector properties point to the two credit card fields.  If you change the
//     ids of the fields, you need to re-point those selectors at the fields properly.
//  See also:
//  http://docs.ultracart.com/display/ucdoc/UltraCart+Hosted+Credit+Card+Fields
// ===============================================================================
var hostedFields = null;

// setup should be called each time the UI updates.
function setupSecureCreditCardFields() {
    // set this to true to see verbose debugging.  usually only UltraCart support will use this.
    window.ultraCartHostedFieldsDebugMode = false;
    hostedFields = UltraCartHostedFields.setup(jQuery, JSON3, {
        'sessionCredentials': {
            'merchantId': merchantId
        },
        'hostedFields': {
            'creditCardNumber': {
                'selector': '#cardNumber'
                , 'callback': function (card) {
                    if (card && card.token) {
                        var tokenField = jQuery('#creditCardNumberToken');
                        if (tokenField && tokenField.length) {
                            tokenField.val(card.token);
                        }
                    }
                }
            }
        }
    });
}


// teardown should be called each time a UI needs destroying.
function teardownSecureCreditCardFields() {
    if (hostedFields !== null) {
        hostedFields.destroy();
        hostedFields = null;
    }
}

// ==========================================================================
// END PCI 3.0 compliance code
// ==========================================================================


function initialize() {

    // find the card record id (if edit).
    var params = uc.commonFunctions.parseHttpParameters();

    var id = null;
    if (params['id'] && params['id'].length) {
        id = params['id'][0];

    }

    loadCreditCard(id);
}


function loadCreditCard(id) {
    teardownSecureCreditCardFields();
    var html = '';

    var years = [];
    var dt = new Date();
    var year = dt.getFullYear();
    for (var i = 0; i < 20; i++) {
        years.push(year + i);
    }

    if (id) {

        //noinspection JSUnusedLocalSymbols
        ultracart.myAccount.getCreditCard(id, {
            success: function (creditCard) {
                html = 'This card could not be loaded at this time.';
                if (creditCard) {
                    creditCard.years = years;
                    html = templates.payment(creditCard);
//        console.log(html);
                }
                jQuery('#payment').html(html);
                bindFields();
                setupSecureCreditCardFields();
            }
        });

    } else {
        html = templates.payment({years: years});
        jQuery('#payment').html(html);
        bindFields();
        setupSecureCreditCardFields();
    }
}

function updatePayment() {
    clearAllMessages();

    // validate the fields
    var id = jQuery.trim(jQuery('#id').val());
    var merchantId = jQuery.trim(jQuery('#merchantId').val()); // this is overwritten at the server for security sake...
    var customerProfileId = jQuery.trim(jQuery('#customerProfileId').val()); // this is double checked at the server level

    var cardType = jQuery.trim(jQuery('#cardType').val());
    var cardExpMonth = jQuery.trim(jQuery('#cardExpMonth').val());
    var cardExpYear = jQuery.trim(jQuery('#cardExpYear').val());
//  var cardNumber = jQuery.trim(jQuery('#cardNumber').val());
    var tokenField = jQuery('#creditCardNumberToken');

    // this may not be present on fields immediately.  it will eventually.
    var creditCardNumberToken = null;
    if (tokenField && tokenField.length) {
        creditCardNumberToken = jQuery.trim(tokenField.val());
    }


    if (!cardType) {
        showError("Card Type is a required field.");
        return;
    }

    if (!cardExpMonth) {
        showError("Please select the expiration month.");
        return;
    }

    if (!cardExpYear) {
        showError("Please select the expiration year.");
        return;
    }

    if (!id && !creditCardNumberToken) {
        showError("Card Number is a required field.");
        return;
    }


    var functionName = 'insertCreditCard';
    if (id) {
        functionName = 'updateCreditCard';
    }

    var creditCard = {
        id: id === '' ? -1 : parseInt(id),
        merchantId: merchantId,
        customerProfileId: customerProfileId === '' ? -1 : parseInt(customerProfileId),
        cardType: cardType,
        cardExpMonth: parseInt(cardExpMonth),
        cardExpYear: parseInt(cardExpYear),
//    cardNumber: cardNumber,
        creditCardNumberToken: creditCardNumberToken
    };

    ultracart.myAccount[functionName](creditCard, {
        success: function (creditCard) {
            showSuccess("Your changes were saved.  Press back on your browser to return to your payment list.");
            // set the id so subsequent saves are updates.
            jQuery('#id').val(creditCard.id);
            jQuery('#merchantId').val(creditCard.merchantId);
            jQuery('#customerProfileId').val(creditCard.customerProfileId);

        },
        failure: function (jqXHR) {
            var errorMsg = null;
            if (jqXHR && jqXHR.getResponseHeader) {
                errorMsg = jqXHR.getResponseHeader('UC-REST-ERROR');
            }

            if (errorMsg) {
                showError("Save failed with this error: " + errorMsg);
            } else {
                showError("Your card could not be saved at this time.  Please try again later.");
            }

        }
    });


}


function bindFields() {
    jQuery('#cancelButton').unbind().bind('click', function () {
        window.history.back();
    });

    jQuery('#saveButton').unbind().bind('click', updatePayment);

}


jQuery(document).ready(function () {
    enablePleaseWaitMessage();
    templates.payment = Handlebars.compile(jQuery('#payment-template').html());
    initialize();

});
