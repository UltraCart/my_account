
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
app.zombieHunters.appView = uc.commonFunctions.createAppView('orders');


// ---------------------------------------------------------
// common functions
// ---------------------------------------------------------


// ---------------------------------------------------------
// data models
// ---------------------------------------------------------

app.models.Order = Backbone.Model.extend({
  'idAttribute': 'orderId',
  url: function () {
        // restUrl is defined in myaccount_rest_X.X.js
    return restUrl + '/orders/' + this.get('orderId')
  }
});

app.collections.Orders = uc.collections.PagedCollection.extend({
  model: app.models.Order,
      // restUrl is defined in myaccount_rest_X.X.js
  url: restUrl + '/orders',
  everBeenFetched: false
});

// an empty disconnected model used to prevent the same query from running multiple times simultaneously. (i.e. user clicks button numerous times)
app.models.StateManager = Backbone.Model.extend();


// ---------------------------------------------------------
// views
// ---------------------------------------------------------

// ---------------------------------------------------------------------
// --- Order ---
// ---------------------------------------------------------------------
app.views.Order = Backbone.View.extend({
  tagName: 'article',
  events: {
    "click .reviewButton": 'showReviewItems',
    "click .reviewItemSelector": 'redirectToReview',
    "click .trackingButton": 'showTracking',
    "click .commentButton": 'showComments',
    "click .case-message-button": 'sendFeedback'
  },
  single: false, // if true, this model should listen to its own model event triggers

  'onClose': function () {
    if (this.single) {
      this.model.on('sync', this.render, this);
    }
  },

  initialize: function (attributes, options) {
    if (options && options.single) {
      this.model.on('sync', this.render, this);
      this.single = true;
    }
    _.bindAll(this);
  },

  render: function () {
//    console.log('order ' + this.model.get('orderId') + ' render');
    var context = this.model.attributes;
    this.$el.html(app.templates.order(context));
    this.$el.addClass('order');
    return this;
  },

  'redirectToReview': function (event) {
    var element = jQuery(event.target);
    var itemId = element.attr('data-itemid');
    location.href = "https://secure.ultracart.com/cgi-bin/UCReviewItem?merchantId=" + encodeURIComponent(this.model.get('merchantId')) + "&itemId=" + encodeURIComponent(itemId);
  },

  'showReviewItems': function () {
    // check to see if there's only one item.  If so, just redirect to that.
    var items = this.model.get('items');
    if (items && items.length == 1) {
      var itemId = items[0].itemId;
      location.href = "https://secure.ultracart.com/cgi-bin/UCReviewItem?merchantId=" + encodeURIComponent(this.model.get('merchantId')) + "&itemId=" + encodeURIComponent(itemId);
    } else {
      jQuery('.reviewItemsPanel', this.$el).show();
    }
  },

  'showComments': function () {
    var that = this;
    if (this.model.get('orderCase')) {
      // load up all the messages.
      ultracart.myAccount.getOrderCaseMessages(this.model.get('orderId'), {
        success: function (messages) {
          that.model.get('orderCase').messages = messages;
          that.render();
          jQuery('.case-container', that.$el).show();

        }, failure: function () {
          alert('Your comments for this order cannot be loaded at this time.  Please try again later.  Sorry.');
        }
      });
    } else {
      jQuery('.case-container', this.$el).show();
    }

  },

  'sendFeedback': function () {
    var that = this;

    var message = jQuery.trim(jQuery('.case-message-field', this.$el).val());
    if (!message) {
      alert('Please enter a message before continuing.');
      return;
    }

    var subject = jQuery.trim(jQuery('.case-subject-field').val());
    if (!subject) {
      subject = "Feedback for Order #" + this.model.get('orderId');
    }


    var hasCase = this.model.get('orderCase') ? true : false;
    if (hasCase) {
      ultracart.myAccount.insertOrderCaseMessage(this.model.get('orderId'), message, {
        'success': function (caseMessage) {
          var messages = that.model.get('orderCase').messages || [];
          messages.push(caseMessage);
          that.model.get('orderCase').messages = messages;
          that.render();
          jQuery('.case-container', that.$el).show();
        }, 'failure': function () {
          alert('Your comments failed to send.  Please try again later.  Sorry.');
        }
      });
    } else {

      // need to create the case as well.
      var orderCase = {
        subject: subject,
        messages: [
          {message: message}
        ]
      };

      ultracart.myAccount.insertOrderCase(this.model.get('orderId'), orderCase, {
        'success': function (result) {
          that.model.set({'orderCase': result}, {silent: true});
          that.render();
          jQuery('.case-container', that.$el).show();
        }, 'failure': function () {
          alert('Your comments failed to send.  Please try again later.  Sorry.');
        }
      });

    }

  },

  'showTracking': function () {

    jQuery('.tracking-container', this.$el).show();
    var that = this;
    var orderId = this.model.get('orderId');

    ultracart.myAccount.getOrderTracking(orderId, {
      success: function (tracking) {
        if (tracking && tracking.length == 0) {
          alert('Sorry. There is no tracking information available for this order at this time.');
        } else {
          var html = app.templates.tracking({tracking: tracking});
          jQuery('.tracking-container', that.$el).html(html);

        }
      },
      failure: function () {
        alert('Sorry. Tracking Information could not be loaded at this time.');
      }

    });

  }



});


// ---------------------------------------------------------------------
// --- Orders ---
// ---------------------------------------------------------------------
app.views.Orders = Backbone.View.extend({
  tagName: 'div',
  childViews: [],
  events: {
    "click a.orderNavCell": "gotoPage"
  },

  'onClose': function () {
    this.collection.off('sync reset change', this.render, this);
    this.closeChildren();
    // dispose of the children
    _.each(this.childViews, function (view) {
      view.close();
    });
  },

  initialize: function () {
    this.collection.on('sync reset change', this.render, this);
    _.bindAll(this);
  },

  render: function () {

//    console.log('orders.render');



    // these pagination variables are set auto-magically by the PagedCollection model based on headers returned in the query
    var firstRecordOnPage = ((this.collection.pageNumber - 1) * this.collection.pageSize) + 1;
    var lastRecordOnPage = Math.min(this.collection.pageNumber * this.collection.pageSize, this.collection.totalRecords);

    var duration = 'this time period';
    var timeFilter = document.getElementById('timeFilter');
    if (timeFilter && timeFilter.selectedIndex > 0) {
      duration = timeFilter.options[timeFilter.selectedIndex].text;
    }

    var context = null;

    if (this.collection.everBeenFetched) {
      context = {
        'isFilterByTime': this.isFilterByTime ? true : false,
        'isSearch': this.isSearch ? true : false,
        'loading': false,
        'showPagination': this.collection.length > 0,
        'totalRecords': this.collection.totalRecords,
        'pageNumber': this.collection.pageNumber,
        'totalPages': this.collection.totalPages,
        'timePeriod': duration,
        'firstRecordOnPage': firstRecordOnPage,
        'lastRecordOnPage': lastRecordOnPage,
        'showGotoPage': this.collection.totalPages > 1,
        'showPrevious': this.collection.pageNumber > 1,
        'showNext': this.collection.pageNumber < this.collection.totalPages
      };
    } else {
      context = {
        'loading': true,
        'showPagination': false
      };

    }

    this.$el.html(app.templates.orders(context));

    var that = this;

    // the first time, we don't need to do any clean up.  but subsequent render() calls need to close down any
    // existing views to avoid zombie event handlers.
    this.closeChildren();
    this.childViews = []; // re-init on each render so we capture any and all changed.

    this.collection.each(function (model) {
      that.childViews.push(new app.views.Order({model: model}));
    });

    var ordersDiv = jQuery('#orders', this.el);
    _.each(this.childViews, function (view) {
      view.render();
      ordersDiv.append(view.el);
    });

    if(this.childViews.length == 0){
      ordersDiv.append("No orders found.");
    }

    return this;
  },


  'closeChildren': function () {
    _.each(this.childViews, function (view) {
      view.close();
    });
  },

  'gotoPage': function (event) {
    event.preventDefault();
    var anchor = jQuery(event.target);
    var page = anchor.text();

    var currentPage = this.collection.pageNumber;
    if (page == 'Previous') {
      this.collection.queryParameters[this.collection.paginationParameters['pageNumber']] = currentPage - 1;
    } else if (page == 'Next') {
      this.collection.queryParameters[this.collection.paginationParameters['pageNumber']] = currentPage + 1;
    }


    // apply the time filter if there is one.
    if (this.isSearch) {

      var search = jQuery.trim(jQuery('#searchOrdersField').val());
      var options = {};
      if (search) {
        options['data'] = {'search': search}
      }

    } else {
      var filter = jQuery('#timeFilter').val();
      var options = {};
      if (filter) {
        options['data'] = {'_filterTime': filter}
      }
    }

    if (!app.data.stateManager.get('orderQuery')) {
      app.data.stateManager.set({'orderQuery': true});
      this.collection.fetch(options).always(function () {
        app.data.stateManager.set({'orderQuery': false});
      });
    }
  }


});


// ---------------------------------------------------------------------
// --- router (a kind of controller) ---
// ---------------------------------------------------------------------
app.Router = Backbone.Router.extend({
  routes: {
    "": "defaultRoute",
    "filter/:timeFrame": "filterByTime",
    "search/:phrase": "search",
    "order/:orderId": "loadSingleOrder"
  },

  'defaultRoute': function () {
//    console.log('router:defaultRoute');
    jQuery('#timeFilter').val("last6months");

    var ordersView = new app.views.Orders({'collection': app.data.orders});
    ordersView.isFilterByTime = true;
    ordersView.isSearch = false;
    app.data.orders.everBeenFetched = false; // reset the fetch so the 'please wait' shows again.
    app.zombieHunters.appView.showView(ordersView);
    // everBeenFetched is a collection property used to distinguish between an initial page load and when there are no records
    // returned from the server.  The former should show 'please wait, loading records', the latter should show 'no records found'
    app.data.orders.fetch({success: function (collection) {
      collection.everBeenFetched = true;
    }});
  },

  'filterByTime': function (timeFrame) {
//    console.log('router:filterByTime');

    // update the select box appropriately.  It may already be this values if it triggered the hash change.  doesn't matter.
    jQuery('#timeFilter').val(timeFrame);

    var ordersView = new app.views.Orders({'collection': app.data.orders});
    ordersView.isFilterByTime = true;
    ordersView.isSearch = false;
    app.data.orders.everBeenFetched = false; // reset the fetch so the 'please wait' shows again.
    app.zombieHunters.appView.showView(ordersView);
    // everBeenFetched is a collection property used to distinguish between an initial page load and when there are no records
    // returned from the server.  The former should show 'please wait, loading records', the latter should show 'no records found'
    app.data.orders.fetch({
      data: {'_filterTime': timeFrame},
      success: function (collection) {
        collection.everBeenFetched = true;
      }});
  },

  'search': function (phrase) {
    var ordersView = new app.views.Orders({'collection': app.data.orders});
    ordersView.isSearch = true;
    ordersView.isFilterByTime = false;
    app.data.orders.everBeenFetched = false; // reset the fetch so the 'please wait' shows again.
    app.zombieHunters.appView.showView(ordersView);
    // everBeenFetched is a collection property used to distinguish between an initial page load and when there are no records
    // returned from the server.  The former should show 'please wait, loading records', the latter should show 'no records found'
    app.data.orders.fetch({
      data: {'search': phrase},
      success: function (collection) {
        collection.everBeenFetched = true;
      }});

  },


  'loadSingleOrder': function (orderId) {
//    console.log('router:loadSingleOrder');
    var model = new app.models.Order({'orderId': orderId});
    var orderView = new app.views.Order({'model': model}, {single: true});
    app.zombieHunters.appView.showView(orderView);
    model.fetch();
  }

});


jQuery(document).ready(function () {
  enablePleaseWaitMessage();

  // fill in the date search with the last 10 years.
  var dt = new Date();
  var year = dt.getYear() + 1900;
  var html = '';
  for (var i = 0; i < 10; i++) {
    html += "<option value='year-" + (year - i) + "'>" + (year - i) + "</option>";
  }
  jQuery('#timeFilter').append(html);

  // bind any non-backbone js events
  jQuery('#filterOrdersButton').bind('click', function () {
    var timeFrame = jQuery('#timeFilter').val();
    if (timeFrame) {
      app.router.navigate('#filter/' + timeFrame, {trigger: true});
    }
  });

  jQuery('#searchOrdersButton').unbind().bind('click', function () {
    var search = jQuery.trim(jQuery('#searchOrdersField').val());
    if (search) {
      app.router.navigate('#search/' + encodeURIComponent(search), {trigger: true});
    }


  });


  app.data.stateManager = new app.models.StateManager();
  app.data.orders = new app.collections.Orders();

  app.templates.order = Handlebars.compile(jQuery('#order-template').html());
  app.templates.orders = Handlebars.compile(jQuery('#orders-template').html());
  app.templates.tracking = Handlebars.compile(jQuery('#tracking-template').html());

  app.router = new app.Router();
  Backbone.history.start({root: document.location.pathname});

});
