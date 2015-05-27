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
app.zombieHunters.appView = uc.commonFunctions.createAppView('wishlist');


// ---------------------------------------------------------
// common functions
// ---------------------------------------------------------


// ---------------------------------------------------------
// data models
// ---------------------------------------------------------

app.models.WishlistItem = Backbone.Model.extend({
  'idAttribute': 'wishlistOid',
  url: function () {
    return restUrl + '/wishlist/' + this.get('wishlistOid')
  }
});

app.collections.Wishlist = uc.collections.PagedCollection.extend({
  model: app.models.WishlistItem,
  url: restUrl + '/wishlist',
  everBeenFetched: false
});

// an empty disconnected model used to prevent the same query from running multiple times simultaneously. (i.e. user clicks button numerous times)
app.models.StateManager = Backbone.Model.extend();


// ---------------------------------------------------------
// views
// ---------------------------------------------------------

// ---------------------------------------------------------------------
// --- Wish List ---
// ---------------------------------------------------------------------
app.views.Wishlist = Backbone.View.extend({
  tagName: 'div',
  events: {
    "click #sortWishlistButton": "sortWishlist",
    "click .editWishlistItemButton": 'editWishlistItem',
    "click .cancelWishlistItemButton": 'cancelWishlistItem',
    "click .updateWishlistItemButton": 'updateWishlistItem',
    "click .deleteWishlistItemButton": 'deleteWishlistItem',
    "click .viewWishlistItemButton": 'viewItem',
    "click a.wishlistNavCell": "gotoPage",
    "click .addWishlistItemToCartButton": "addToCart"
  },

  'onClose': function () {
    this.collection.off('sync reset change remove', this.render, this);
  },

  initialize: function () {
    this.collection.on('sync reset change remove', this.render, this);
    _.bindAll(this);
  },

  render: function () {

    // these pagination variables are set auto-magically by the PagedCollection model based on headers returned in the query
    var firstRecordOnPage = ((this.collection.pageNumber - 1) * this.collection.pageSize) + 1;
    var lastRecordOnPage = Math.min(this.collection.pageNumber * this.collection.pageSize, this.collection.totalRecords);
    var context = null;

    var wishlistItems = [];
    _.each(this.collection.models, function (model) {
      var attr = jQuery.extend({}, model.attributes);
      var priorityFormatted = "Medium";
      switch (attr.priority) {
        case 1:
          priorityFormatted = "Lowest";
          break;
        case 2:
          priorityFormatted = "Low";
          break;
        case 3:
          priorityFormatted = "Medium";
          break;
        case 4:
          priorityFormatted = "High";
          break;
        case 5:
          priorityFormatted = "Highest";
          break;
        default:
          priorityFormatted = "Medium";
      }
      attr.priorityFormatted = priorityFormatted;
      wishlistItems.push(attr);
    });

    if (this.collection.everBeenFetched) {
      context = {
        'loading': false,
        'showPagination': this.collection.length > 0,
        'totalRecords': this.collection.totalRecords,
        'pageNumber': this.collection.pageNumber,
        'totalPages': this.collection.totalPages,
        'firstRecordOnPage': firstRecordOnPage,
        'lastRecordOnPage': lastRecordOnPage,
        'showGotoPage': this.collection.totalPages > 1,
        'showPrevious': this.collection.pageNumber > 1,
        'showNext': this.collection.pageNumber < this.collection.totalPages,
        'wishlistItems': wishlistItems
      };
    } else {
      context = {
        'loading': true,
        'showPagination': false
      };

    }

    this.$el.html(app.templates.wishlist(context));

    return this;
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


    var sortBy = jQuery('#sortBySelect').val();
    var options = {};
    if (sortBy) {
      options['data'] = {'sortBy': sortBy}
    }



    if (!app.data.stateManager.get('wishlistQuery')) {
      app.data.stateManager.set({'wishlistQuery': true});
      this.collection.fetch(options).always(function () {
        app.data.stateManager.set({'wishlistQuery': false});
      });
    }
  },


  'cancelWishlistItem': function (event) {
    var element = jQuery(event.target);
    var wishlistOid = element.attr('data-oid');

    var parentRow = jQuery('#wl_' + wishlistOid);
    if(parentRow && parentRow.length){
      jQuery('.priorityDisplay', parentRow).show();
      jQuery('.commentsDisplay', parentRow).show();
      jQuery('.priorityEdit', parentRow).hide();
      jQuery('.commentsEdit', parentRow).hide();
      jQuery('.editWishlistItemButton', parentRow).show();
      jQuery('.deleteWishlistItemButton', parentRow).show();
      jQuery('.updateWishlistItemButton', parentRow).hide();
      jQuery('.cancelWishlistItemButton', parentRow).hide();
    }

  },


  'editWishlistItem': function (event) {
    var element = jQuery(event.target);
    var wishlistOid = element.attr('data-oid');

    var model = this.collection.get(wishlistOid);
    if(model){

      var parentRow = jQuery('#wl_' + wishlistOid);
      jQuery('.priorityDisplay', parentRow).hide();
      jQuery('.commentsDisplay', parentRow).hide();
      jQuery('.priorityEdit', parentRow).val(model.get('priority')).show();
      jQuery('.commentsEdit', parentRow).val(model.get('comments')).show();
      jQuery('.editWishlistItemButton', parentRow).hide();
      jQuery('.deleteWishlistItemButton', parentRow).hide();
      jQuery('.updateWishlistItemButton', parentRow).show();
      jQuery('.cancelWishlistItemButton', parentRow).show();
    } else {
      // should never happen
      alert('This wishlist item could not be edited at this time.');
    }
  },


  'addToCart': function (event) {
    var element = jQuery(event.target);
    var wishlistOid = element.attr('data-oid');


    var model = this.collection.get(wishlistOid);
    if(model){

      myAccount.addWishlistItemToCart(model.get('itemId'),{
        'success': function(/*updatedCart*/){
          alert('The item was added to your shopping cart.');
        }
      });

    } else {

      // should never happen
      alert('Changes could not be saved at this time.');
    }


  },


  'updateWishlistItem': function (event) {
    var element = jQuery(event.target);
    var wishlistOid = element.attr('data-oid');


    var model = this.collection.get(wishlistOid);
    if(model){

      var parentRow = jQuery('#wl_' + wishlistOid);
      jQuery('.priorityDisplay', parentRow).hide();
      jQuery('.commentsDisplay', parentRow).hide();
      var priority = parseInt(jQuery('.priorityEdit', parentRow).val());
      var comments = jQuery('.commentsEdit', parentRow).val();

      model.save({'priority': priority, 'comments': comments}, {'wait': true});
    } else {

      // should never happen
      alert('Changes could not be saved at this time.');
    }


  },


  'deleteWishlistItem': function (event) {
    var element = jQuery(event.target);
    var wishlistOid = element.attr('data-oid');

    if(confirm('Please confirm you wish to delete this item.')){
      var model = this.collection.get(wishlistOid);
      if(model){
        model.destroy({'wait': true});
      }
    }
  }


});


// ---------------------------------------------------------------------
// --- router (a kind of controller) ---
// ---------------------------------------------------------------------
app.Router = Backbone.Router.extend({
  routes: {
    "sortBy/:sortBy": "sortByRoute",
    "": "defaultRoute"
  },


  'sortByRoute': function (sortBy) {
    // update the select box appropriately.  It may already be this values if it triggered the hash change.  doesn't matter.
    jQuery('#sortBySelect').val(sortBy);

    var wishlistView = new app.views.Wishlist({'collection': app.data.wishlist});
    app.data.wishlist.everBeenFetched = false; // reset the fetch so the 'please wait' shows again.
    app.zombieHunters.appView.showView(wishlistView);
    // everBeenFetched is a collection property used to distinguish between an initial page load and when there are no records
    // returned from the server.  The former should show 'please wait, loading records', the latter should show 'no records found'
    app.data.wishlist.fetch({
      data: {'sortBy': sortBy},
      success: function (collection) {
        collection.everBeenFetched = true;
      }});
  },

  'defaultRoute': function () {

    var wishlistView = new app.views.Wishlist({'collection': app.data.wishlist});
    app.data.wishlist.everBeenFetched = false; // reset the fetch so the 'please wait' shows again.
    app.zombieHunters.appView.showView(wishlistView);
    // everBeenFetched is a collection property used to distinguish between an initial page load and when there are no records
    // returned from the server.  The former should show 'please wait, loading records', the latter should show 'no records found'
    app.data.wishlist.fetch({success: function (collection) {
      collection.everBeenFetched = true;
    }});
  }


});


jQuery(document).ready(function () {
  enablePleaseWaitMessage();

  // bind any non-backbone js events
  jQuery('#sortWishlistButton').bind('click', function () {
    var sortBy = jQuery('#sortBySelect').val();
    if (sortBy) {
      app.router.navigate('#sortBy/' + sortBy, {trigger: true});
    }
  });



  app.data.stateManager = new app.models.StateManager();
  app.data.wishlist = new app.collections.Wishlist();
  app.templates.wishlist = Handlebars.compile(jQuery('#wishlist-template').html());

  app.router = new app.Router();
  Backbone.history.start({root: document.location.pathname});

});
