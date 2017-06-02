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
    if (xhr.status == 401)
        redirectToLogin();
});

jQuery.ajaxSetup({cache: false});

// ---------------------------------------------------------
// app skeleton
// ---------------------------------------------------------

var app = {
    models: {},  // The M in MVC
    collections: {},  // Also the M in MVC, just collections of them.
    views: {},  // The V in MVC
    templates: [],
    zombieHunters: {}, // extensions that clean up event binding to avoid zombie event handlers
    commonFunctions: {}, // functions that are used in numerous places
    // the router is kind-of the C in MVC, but not in the traditional sense.  It's more of a helper controller,
    // which takes a look at the url (and fragments), and does additional things based on what it is.
    // the router is created during document.ready
    router: null,
    data: {} // this will hold *instances* of collections and models.  This is actual data, not definitions
};

// ---------------------------------------------------------------------
// --- zombie hunters  (prevent orphaned event handlers)
// ---------------------------------------------------------------------
app.zombieHunters.appView = uc.commonFunctions.createAppView('payments');


// ---------------------------------------------------------
// common functions
// ---------------------------------------------------------


// ---------------------------------------------------------
// data models
// ---------------------------------------------------------

app.models.Payment = Backbone.Model.extend({
    url: function () {
        // restUrl is defined in myaccount_rest_X.X.js
        return restUrl + '/creditCards/' + this.get('id');
    }
});

app.collections.Payments = Backbone.Collection.extend({
    model: app.models.Payment,
    // restUrl is defined in myaccount_rest_X.X.js
    url: restUrl + '/creditCards',
    everBeenFetched: false
});

// an empty disconnected model used to prevent the same query from running multiple times simultaneously. (i.e. user clicks button numerous times)
app.models.StateManager = Backbone.Model.extend();


// ---------------------------------------------------------
// views
// ---------------------------------------------------------

// ---------------------------------------------------------------------
// --- Payment ---
// ---------------------------------------------------------------------
app.views.Payment = Backbone.View.extend({
    tagName: 'article',
    events: {
        "click .editButton": 'editPayment',
        "click .deleteButton": 'deletePayment'
    },

    'onClose': function () {
    },

    initialize: function () {
        _.bindAll(this);
    },

    render: function () {
//    console.log('payment ' + this.model.get('id') + ' render');
        var context = this.model.attributes;

        var dt = new Date();
        var month = dt.getMonth() + 1;
        var year = dt.getYear() + 1900;


        var cardNames = {};
        cardNames['VISA'] = 'VISA';
        cardNames['MasterCard'] = 'MasterCard';
        cardNames['Discover'] = 'Discover Card';
        cardNames['Diners Club'] = 'Diners Club';
        cardNames['JCB'] = 'JCB';
        cardNames['AMEX'] = 'American Express';

        var cardName = cardNames[this.model.get('cardType')] || this.model.get('cardType');

        context.expired = (this.model.get('cardExpYear') < year || (this.model.get('cardExpYear') <= year && this.model.get('cardExpMonth') < month));
        context.cardName = cardName;

        this.$el.html(app.templates.payment(context));
        this.$el.addClass('payment');
        return this;
    },

    'editPayment': function () {
        location.href = "payment.html?id=" + this.model.get('id');
    },

    'deletePayment': function () {
        if (confirm('Are you sure you want to delete this credit card?')) {
            this.model.destroy();
        }
    }

});


// ---------------------------------------------------------------------
// --- Payments ---
// ---------------------------------------------------------------------
app.views.Payments = Backbone.View.extend({
    tagName: 'div',
    childViews: [],
    events: {
        "click .addButton": 'addPayment'
    },

    'onClose': function () {
        this.collection.off('sync reset change remove', this.render, this);
        this.closeChildren();
        // dispose of the children
        _.each(this.childViews, function (view) {
            view.close();
        });
    },

    initialize: function () {
        this.collection.on('sync reset change remove', this.render, this);
        _.bindAll(this);
    },

    render: function () {

//    console.log('orders.render');

        var context = null;

        if (this.collection.everBeenFetched) {
            context = {
                'loading': false,
                'hasPayments': this.collection.length > 0
            };
        } else {
            context = {
                'loading': true
            };

        }

        this.$el.html(app.templates.payments(context));

        var that = this;

        // the first time, we don't need to do any clean up.  but subsequent render() calls need to close down any
        // existing views to avoid zombie event handlers.
        this.closeChildren();
        this.childViews = []; // re-init on each render so we capture any and all changed.

        var counter = 1;
        this.collection.each(function (model) {
            model.set({'position': counter}, {silent: true});
            counter++;
            that.childViews.push(new app.views.Payment({model: model}));
        });

        var ordersDiv = jQuery('#payments', this.el);
        _.each(this.childViews, function (view) {
            view.render();
            ordersDiv.append(view.el);
        });

        return this;
    },


    'closeChildren': function () {
        _.each(this.childViews, function (view) {
            view.close();
        });
    },

    'addPayment': function () {
        location.href = "payment.html";
    }


});


jQuery(document).ready(function () {
    enablePleaseWaitMessage();

    app.data.stateManager = new app.models.StateManager();
    app.data.payments = new app.collections.Payments();

    app.templates.payment = Handlebars.compile(jQuery('#payment-template').html());
    app.templates.payments = Handlebars.compile(jQuery('#payments-template').html());

    var paymentsView = new app.views.Payments({'collection': app.data.payments});
    app.data.payments.everBeenFetched = false; // reset the fetch so the 'please wait' shows again.
    app.zombieHunters.appView.showView(paymentsView);
    // everBeenFetched is a collection property used to distinguish between an initial page load and when there are no records
    // returned from the server.  The former should show 'please wait, loading records', the latter should show 'no records found'
    app.data.payments.fetch({
        success: function (collection) {
            collection.everBeenFetched = true;
        }
    });


});
