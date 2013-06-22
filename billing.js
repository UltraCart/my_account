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
app.zombieHunters.appView = uc.commonFunctions.createAppView('addresses');


// ---------------------------------------------------------
// common functions
// ---------------------------------------------------------


// ---------------------------------------------------------
// data models
// ---------------------------------------------------------

app.models.Address = Backbone.Model.extend({
  url: function () {
    // restUrl is defined in myaccount_rest_X.X.js
    return restUrl + '/billingAddresses/' + this.get('id');
  }
});

app.collections.Addresses = Backbone.Collection.extend({
  model: app.models.Address,
  // restUrl is defined in myaccount_rest_X.X.js
  url: restUrl + '/billingAddresses',
  everBeenFetched: false
});

// an empty disconnected model used to prevent the same query from running multiple times simultaneously. (i.e. user clicks button numerous times)
app.models.StateManager = Backbone.Model.extend();


// ---------------------------------------------------------
// views
// ---------------------------------------------------------

// ---------------------------------------------------------------------
// --- Address ---
// ---------------------------------------------------------------------
app.views.Address = Backbone.View.extend({
  tagName: 'article',
  events: {
    "click .editButton": 'editAddress',
    "click .deleteButton": 'deleteAddress'
  },

  'onClose': function () {
  },

  initialize: function () {
    _.bindAll(this);
  },

  render: function () {
//    console.log('address ' + this.model.get('id') + ' render');
    var context = this.model.attributes;
    this.$el.html(app.templates.address(context));
    this.$el.addClass('address');
    return this;
  },

  'editAddress': function () {
    location.href = "address.html?type=billing&id=" + this.model.get('id');
  },

  'deleteAddress': function () {
    if (confirm('Are you sure you want to delete this address?')) {
      this.model.destroy();
    }
  }

});


// ---------------------------------------------------------------------
// --- Addresses ---
// ---------------------------------------------------------------------
app.views.Addresses = Backbone.View.extend({
  tagName: 'div',
  childViews: [],
  events: {
    "click .addButton": 'addAddress'
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
        'loading': false
      };
    } else {
      context = {
        'loading': true
      };

    }

    this.$el.html(app.templates.addresses(context));

    var that = this;

    // the first time, we don't need to do any clean up.  but subsequent render() calls need to close down any
    // existing views to avoid zombie event handlers.
    this.closeChildren();
    this.childViews = []; // re-init on each render so we capture any and all changed.

    var counter = 1;
    this.collection.each(function (model) {
      model.set({'position': counter}, {silent: true});
      counter++;
      that.childViews.push(new app.views.Address({model: model}));
    });

    var ordersDiv = jQuery('#addresses', this.el);
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

  'addAddress': function () {
    location.href = "address.html?type=billing";
  }


});


jQuery(document).ready(function () {
  enablePleaseWaitMessage();

  app.data.stateManager = new app.models.StateManager();
  app.data.addresses = new app.collections.Addresses();

  app.templates.address = Handlebars.compile(jQuery('#address-template').html());
  app.templates.addresses = Handlebars.compile(jQuery('#addresses-template').html());

  var addressesView = new app.views.Addresses({'collection': app.data.addresses});
  app.data.addresses.everBeenFetched = false; // reset the fetch so the 'please wait' shows again.
  app.zombieHunters.appView.showView(addressesView);
  // everBeenFetched is a collection property used to distinguish between an initial page load and when there are no records
  // returned from the server.  The former should show 'please wait, loading records', the latter should show 'no records found'
  app.data.addresses.fetch({success: function (collection) {
    collection.everBeenFetched = true;
  }});


});
