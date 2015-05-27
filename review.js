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


app.models.ItemReview = Backbone.Model.extend({
  'idAttribute': 'itemId'
});


// ---------------------------------------------------------------------
// --- Review ---
// ---------------------------------------------------------------------
app.views.Review = Backbone.View.extend({
  tagName: 'article',
  events: {
    "click #cancelButton": "cancelReview",
    "click #saveButton": "saveReview"
  },

  'onClose': function () {
    this.model.on('sync', this.render, this);
  },

  initialize: function () {
    this.model.on('sync', this.render, this);
    _.bindAll(this);
  },

  render: function () {

    // clone the context, then copy all the scores array under each ratings object so the handlebars template is clean.
    var context = jQuery.extend({}, this.model.attributes);   // the ItemReview object is the context.

    if (context.ratings && context.ratings.length && context.scores) {
      for (var i = 0; i < context.ratings.length; i++) {
        context.ratings[i].scores = context.scores.slice();
      }
    }

    console.log("render context follows");
    console.log(context);
    this.$el.html(app.templates.review(context));
    return this;
  },

  'cancelReview': function (event) {
    event.preventDefault();
    event.stopPropagation();
    window.history.back();
  },

  'saveReview': function (event) {
    event.preventDefault();
    event.stopPropagation();
    clearAllMessages();

    var attr = {};
    var recommendToFieldField = jQuery('.recommendToFriend:checked');
    if (recommendToFieldField && recommendToFieldField.length) {
      attr['recommendToField'] = recommendToFieldField.val();
    } else {
      showError("Please select whether you would recommend this item to a friend.");
      return;
    }


    var ratings = [];
    for (var i = 0; i < this.model.get('ratings').length; i++) {
      ratings.push({score: 0});
    }

    jQuery('.ratingScore').each(function (idx, el) {
      if (el.checked) {
        var $el = jQuery(el);
        var position = parseInt($el.data('position'));
        var score = $el.val();
        if (!isNaN(position) && score) {
          ratings[position].score = parseInt(score);
        }
      }
    });

    for (var j = 0; j < ratings.length; j++) {
      if (ratings[j].score == 0) {
        showError("One or more ratings are missing.  Please supply a rating for each category.");
        return;
      }
    }

    // finally, copy over the scores to the full ratings objects.
    attr['ratings'] = this.model.get('ratings');
    for (var k = 0; k < ratings.length; k++) {
      attr.ratings[k].score = ratings[k].score;
    }

    if (this.model.get('showNickname')) {
      attr.nickname = jQuery.trim(jQuery('#nickname').val());
      if (!attr.nickname) {
        showError("Please enter a nickname.");
        return;
      }
    }

    attr.title = jQuery.trim(jQuery('#title').val());
    if (!attr.title) {
      showError("Please enter a title.");
      return;
    }

    attr.review = jQuery.trim(jQuery('#review').val());
    if (!attr.review) {
      showError("Please enter a review.");
      return;
    }

    if (this.model.get('showProfileQuestions')) {
      if (this.model.get('showLocation')) {
        attr.location = jQuery.trim(jQuery('#location').val());
        if (!attr.location) {
          showError("Please enter a location.");
          return;
        }
      }

      // init a question array with the proper length.
      var questions = [];
      for (var m = 0; m < this.model.get('questions').length; m++) {
        questions[m] = {answer: null};
      }


      jQuery('.answer').each(function (idx, el) {
        var $el = jQuery(el);
        var position = $el.data('position');
        var answer = jQuery.trim($el.val());
        if (position && answer) {
          questions[position].answer = answer;
        }
      });

      for (var n = 0; n < questions.length; n++) {
        if (questions[n].answer == 0) {
          showError("One or more questions are missing an answer.  Please supply an answer for each question.");
          return;
        }
      }

      // finally, copy over the answers to the full question objects.
      attr['questions'] = this.model.get('questions');
      for (var p = 0; p < questions.length; p++) {
        attr.questions[p].answer = questions[p].answer;
      }

    }

    if (this.model.get('showStoreSection')) {
      var storeToFriendField = jQuery('.recommendStoreToFriend:checked');
      if (storeToFriendField && storeToFriendField.length) {
        attr.recommendStoreToFriend = storeToFriendField.val();
      } else {
        showError("Please indicate whether you would recommend the store to a friend.");
        return;
      }

      var storeFeedbackField = jQuery('#storeFeedback');
      if (storeFeedbackField && storeFeedbackField.length) {
        attr.storeFeedback = jQuery.trim(storeFeedbackField.val());
      }
    }

    var tcField = jQuery('#agreeToTermsAndConditions');
    if (tcField && tcField.length && tcField.is(":checked")) {
      attr.agreeToTermsAndConditions = true;
    } else {
      showError("You must agree to the Terms and Conditions before we may use your Review.");
      return;
    }

    this.model.set(attr);
    var itemReview = this.model.attributes;


    ultracart.myAccount.updateReview(itemReview, {
      success: function () {
        showSuccess("Your review was submitted.  Press back on your browser to return to your reviews list.");
      },
      failure: function (jqXHR) {
        var errorMsg = null;
        if (jqXHR && jqXHR.getResponseHeader) {
          errorMsg = jqXHR.getResponseHeader('UC-REST-ERROR');
        }

        if (errorMsg) {
          showError("Save failed with this error: " + errorMsg);
        } else {
          showError("Your review could not be submitted.  Please try again later.");
        }
      }
    });
  }

});


function initialize() {

  // find the item id for the item they wish to review
  var params = uc.commonFunctions.parseHttpParameters();

  var itemId = null;
  if (params['itemid'] && params['itemid'].length) {
    itemId = params['itemid'][0];
  }

  loadReview(itemId);
}

function loadReview(itemId) {
  console.log("loading review for ", itemId);

  ultracart.myAccount.getReview(itemId, {
    success: function (itemReview) {
      if (itemReview) {
        console.log(itemReview);
        var reviewContainer = jQuery('.review-info');
        var model = new app.models.ItemReview(itemReview);
        var view = new app.views.Review({model: model});
        reviewContainer.append(view.render().$el);
      }
    },
    failure: function () {
      showError('Sorry. This review could not be loaded at this time.');
    }
  });
}


jQuery(document).ready(function () {
  enablePleaseWaitMessage();
  app.templates.review = Handlebars.compile(jQuery('#item-review-template').html());
  initialize();
});
