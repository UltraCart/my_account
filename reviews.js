var reviewsPageNumber = 1;
var notReviewedYetPageNumber = 1;

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


app.models.Review = Backbone.Model.extend({
  'idAttribute': 'reviewOid'
});

app.models.NotReviewedYet = Backbone.Model.extend({
  'idAttribute': 'itemId'
});




// ---------------------------------------------------------------------
// --- Review ---
// ---------------------------------------------------------------------
app.views.Review = Backbone.View.extend({
  tagName: 'article',
  events: {
  },

  'onClose': function () {
      this.model.on('sync', this.render, this);
  },

  initialize: function () {
      this.model.on('sync', this.render, this);
    _.bindAll(this);
  },

  render: function () {
//    console.log('review ' + this.model.get('reviewOid') + ' render');
    var context = this.model.attributes;
    this.$el.html(app.templates.reviewed(context));
    return this;
  }

});



// ---------------------------------------------------------------------
// --- NotReviewedYet ---
// ---------------------------------------------------------------------
app.views.NotReviewedYet = Backbone.View.extend({
  tagName: 'article',
  events: {
    "click .reviewButton": 'redirectToReview'
  },

  'onClose': function () {
      this.model.on('sync', this.render, this);
  },

  initialize: function () {
      this.model.on('sync', this.render, this);
    _.bindAll(this);
  },

  render: function () {
//    console.log('notReviewedYet ' + this.model.get('itemId') + ' render');
    var context = this.model.attributes;
    this.$el.html(app.templates.notReviewedYet(context));
    return this;
  },

  'redirectToReview': function (event) {
    location.href = "https://secure.ultracart.com/cgi-bin/UCReviewItem?merchantId=" + encodeURIComponent(this.model.get('merchantId')) + "&itemId=" + encodeURIComponent(this.model.get('itemId'));
  }


});



function initialize() {

  bindFields();
  loadReviews();
  loadNotReviewedYet();

}

function loadReviews(){
  ultracart.myAccount.getReviews({
    pageNumber: reviewsPageNumber,
    pageSize: 5,
    success: function(reviews, pagination){
      var reviewed = jQuery('#reviewed');
      reviewed.find('.loading').hide();
      if(pagination){
        if(pagination.pageNumber == 1 && !reviews.length){
          reviewed.find('.reviews').html('You currently have no published reviews.');
        }

        reviewsPageNumber = pagination.pageNumber + 1;
        if(pagination.pageNumber >= pagination.totalPages){
          reviewed.find('.load-more').hide();
        } else {
          reviewed.find('.load-more').show();
        }
      }

      var reviewContainer = reviewed.find('.reviews')
      for(var i = 0; i < reviews.length; i++){
        var model = new app.models.Review(reviews[i]);
        var view = new app.views.Review({model:model});
        reviewContainer.append(view.render().$el);
      }

    },
    failure:function(){
      jQuery('#reviewed').find('.loading').hide();
      showError('Sorry. Reviews could not be loaded at this time.');
    }
  });
}

function loadNotReviewedYet(){
  ultracart.myAccount.getNotReviewedYet({
    pageNumber: notReviewedYetPageNumber,
    pageSize: 5,
    success: function(notReviewedYet, pagination){
      var notReviewed = jQuery('#not-reviewed-yet');
      notReviewed.find('.loading').hide();
      if(pagination){
        if(pagination.pageNumber == 1 && !notReviewed.length){
          notReviewed.find('.reviews').html('You currently have no purchases which need reviews.');
        }

        notReviewedYetPageNumber = pagination.pageNumber + 1;
        if(pagination.pageNumber >= pagination.totalPages){
          notReviewed.find('.load-more').hide();
        } else {
          notReviewed.find('.load-more').show();
        }
      }

      var reviewContainer = notReviewed.find('.reviews')
      for(var i = 0; i < notReviewedYet.length; i++){
        var model = new app.models.NotReviewedYet(notReviewedYet[i]);
        var view = new app.views.NotReviewedYet({model:model});
        reviewContainer.append(view.render().$el);
      }


    },
    failure:function(){
      jQuery('#not-reviewed-yet').find('.loading').hide();
      showError('Sorry. Reviewable items could not be loaded at this time.');
    }
  });

}



function bindFields() {
  jQuery('#loadMoreNotReviewedYetButton').bind('click', loadNotReviewedYet);
  jQuery('#loadMoreReviewsButton').bind('click', loadReviews);
}



jQuery(document).ready(function () {
  enablePleaseWaitMessage();
  app.templates.reviewed = Handlebars.compile(jQuery('#reviewed-template').html());
  app.templates.notReviewedYet = Handlebars.compile(jQuery('#not-reviewed-yet-template').html());
  initialize();

});
