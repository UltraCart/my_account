var templates = {};
var order = null;

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


function initialize() {
    // find the order id.
    var params = uc.commonFunctions.parseHttpParameters();

    if (params['orderid'] && params['orderid'].length) {
        var orderId = params['orderid'][0];
        loadOrder(orderId);
    }

}


function loadOrder(orderId) {
    //noinspection JSUnusedLocalSymbols
    ultracart.myAccount.getOrder(orderId, {
        success: function (order) {
            var html = 'This order could not be found at this time.';
            if (order) {
                html = templates.order(order);
//        console.log(html);
            }
            jQuery('#order').html(html);
        }
    });
}


jQuery(document).ready(function () {
    enablePleaseWaitMessage();
    templates.order = Handlebars.compile(jQuery('#order-template').html());
    initialize();

});
