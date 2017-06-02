if (typeof String.prototype.trim === 'undefined') {
    String.prototype.trim = function () {
        return this.replace(/^\s+|\s+$/g, '');
    };
}
if (typeof String.prototype.startsWith === 'undefined') {
    String.prototype.startsWith = function (str) {
        return (this.indexOf(str) === 0);
    };
}
if (typeof String.prototype.endsWith === 'undefined') {
    String.prototype.endsWith = function (str) {
        return (this.length - str.length) == this.lastIndexOf(str);
    }
}


var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
};

function escapeHtml(string) {
    if (!string) {
        return '';
    }
    return String(string).replace(/[&<>"'\/]/g, function (s) {
        return entityMap[s];
    });
}

if (window.Handlebars) {
//  format an ISO date using Moment.js
//  http://momentjs.com/
//  moment syntax example: moment(Date("2011-07-18T15:50:52")).format("MMMM YYYY")
//  usage: {{dateFormat creation_date format="MMMM YYYY"}}
    Handlebars.registerHelper('dateFormat', function (context, block) {
        if (window.moment && context && moment(context).isValid()) {
            var f = block.hash.format || "MMM Do, YYYY";
            return moment(context).format(f);
        } else {
            return context;   //  moment plugin is not available, context does not have a truthy value, or context is not a valid date
        }
    });

//  format strips out anything that would break html if it was used as a class name.  especially spaces.
//  usage: {{validClassName some_field}}
    Handlebars.registerHelper('validClassName', function (context) {
        if (context) {
            return context.replace(/[^0-9a-zA-Z\-_]/, '_');
        } else {
            return context;
        }
    });


//  formats the string into all lowercase separated by dashes.  Strips out naughty stuff.
//  usage: {{classify some_field}}
    Handlebars.registerHelper('classify', function (context) {
        if (context) {
            var result = context.toLowerCase().replace(' ', '-');
            return result.replace(/[^0-9a-zA-Z\-_]/, '-');
        } else {
            return context;
        }
    });


//  Used in rendering order detail, starts a table section
//  usage: {{startSection id="itemSection" classes="no-refund clazz2 clazz3"}}
    Handlebars.registerHelper('startSection', function (block) {

        var id = block.hash.id || '';
        var that = this;
        if (id.indexOf('[') > -1) {
            id = id.replace(/\[(.*?)\]/g, function (match, group1) {
                return that[group1];
            })
        }

        var classesStr = block.hash.classes || '';
        var classes = classesStr.split(' ');
        for (var i = 0; i < classes.length; i++) {
            if (classes[i].indexOf('[') > -1) {
                classes[i] = classes[i].replace(/\[(.*?)\]/g, function (match, group1) {
                    return that[group1];
                })
            }

            // make sure nothing in the classes breaks the page.
            classes[i] = classes[i].replace(/[^0-9a-zA-Z\-_]/, '_');
        }


        return new Handlebars.SafeString(
            "<tr><td><table "
            + (id ? ("id='" + id + "' ") : "")
            + (classes.length ? ("class='" + classes.join(' ') + "' ") : "")
            + ">");
    });


    //  Used in rendering order detail, creates a field complete with lots of classes
    //  usage: {{htmlField name="firstName" label="First Name" value="[shipToFirstName]" classes="strong-class bold-class" delimiter=":" isDate="1|0" isYesNo="1|0|}}
    // classes is optional.  it is a space separated list of additional classes to attach to the table row.
    // delimiter is optional. If empty, a colon is used.  An empty string may be used to not print a delimiter.
    // isDate is optional.  If present and non-falsy, it will format the value (expected to be ISO8601) into a pretty printed value.
    // isYesNo is optional.  If present and the string 'true', it will print "Yes", else "No" (better than true/false printing)

    Handlebars.registerHelper('htmlField', function (block) {

        var that = this; // this refers to the context, which should be the order object itself

        var delimiter = ':';
        if (block.hash.hasOwnProperty('delimiter')) {
            delimiter = block.hash.delimiter;
        }


        // the value field may be null, or the referenced field may be null;
        var value = block.hash.value || null;
        if (value) {
            if (value.indexOf('[') > -1) {
                value = value.replace(/\[(.*?)\]/g, function (match, group1) {
                    return that[group1] || '';
                })
            }
        }

        if (!value) {
            value = ''; // don't want to print a "null"
        }


        var classesStr = block.hash.classes || '';
        var classes = classesStr.split(' ');
        for (var i = 0; i < classes.length; i++) {
            if (classes[i].indexOf('[') > -1) {
                classes[i] = classes[i].replace(/\[(.*?)\]/g, function (match, group1) {
                    return that[group1];
                })
            }

            // make sure nothing in the classes breaks the page.
            classes[i] = classes[i].replace(/[^0-9a-zA-Z\-_]/, '_');
        }


        var isEmpty = (value == null || value == '');
        var label = block.hash.label || '';
        var name = block.hash.name || '';
        if (name.indexOf('[') > -1) {
            name = name.replace(/\[(.*?)\]/g, function (match, group1) {
                return that[group1] || '';
            });
            name = name.replace(/[^0-9a-zA-Z\-_]/, '_');
        }


        var isDate = block.hash.isDate ? true : false;
        if (isDate) {
            value = moment(value).format("MMM Do, YYYY");
        }

        var isYesNo = block.hash.isYesNo ? true : false;
        if (isYesNo) {
            value = value == true ? "Yes" : "No";
        }


        var html = '';
        html += "<tr class='" + name + " ";
        if (classes.length) {
            html += classes.join(' ') + ' ';
        }
        if (isEmpty) {
            html += "emptyField ";
        }
        html += "'>";

        if (label) {
            html += "<td class='" + name + "-label label'>" + label + ":</td>";
        }
        html += "<td class='" + name + "-field field'>" + escapeHtml(value) + "</td>";
        html += "</tr>";

        return new Handlebars.SafeString(html);
    });


//  Used in rendering order detail, ends a table section
//  usage: {{endSection}}
    Handlebars.registerHelper('endSection', function () {
        return new Handlebars.SafeString("</table></td></tr>");
    });


// usage:
// {{compare context_variable 'some_literal' operator="=="}}
    Handlebars.registerHelper('compare', function (lvalue, rvalue, options) {

        if (arguments.length < 3)
            throw new Error("Handlebars Helper 'compare' needs 2 parameters");

        operator = options.hash.operator || "==";

        var operators = {
            '==': function (l, r) {
                return l == r;
            },
            '===': function (l, r) {
                return l === r;
            },
            '!=': function (l, r) {
                return l != r;
            },
            '<': function (l, r) {
                return l < r;
            },
            '>': function (l, r) {
                return l > r;
            },
            '<=': function (l, r) {
                return l <= r;
            },
            '>=': function (l, r) {
                return l >= r;
            },
            'typeof': function (l, r) {
                return typeof l == r;
            }
        };

        if (!operators[operator])
            throw new Error("Handlebars Helper 'compare' doesn't know the operator " + operator);

        var result = operators[operator](lvalue, rvalue);

        if (result) {
            return options.fn(this);
        } else {
            return options.inverse(this);
        }
    });


    /**
     * ucSelectOption1 takes a conditional as the second argument
     */
    Handlebars.registerHelper('ucSelectOption1', function (value, conditional, options) {
        var html = "<option value='" + Handlebars.Utils.escapeExpression(value) + "'";
        if (conditional) {
            html += " selected='selected'";
        }
        html += ">" + Handlebars.Utils.escapeExpression(options.fn(this)) + "</option>";
        return html;
    });

    /**
     * ucSelectOption2 takes a target value to compare
     */
    Handlebars.registerHelper('ucSelectOption2', function (value, target, options) {
        var html = "<option value='" + Handlebars.Utils.escapeExpression(value) + "'";
        if (value && target && value == target) {
            html += " selected='selected'";
        }
        html += ">" + Handlebars.Utils.escapeExpression(options.fn(this)) + "</option>";
        return html;
    });


}


function enablePleaseWaitMessage() {
    jQuery('body').append("<div class='PW_outer'><div class='PW_inner'>Communicating with server...<br /><img src='images/jquery.smallhbar.indicator.gif' alt='please wait'/></div></div>");
    jQuery('.PW_inner').hide();
    jQuery(document).ajaxStart(
        function () {
            jQuery('.PW_outer').css({'z-index': '9999'});
            jQuery('.PW_inner').show();
        }).ajaxStop(function () {
        jQuery('.PW_outer').css({'z-index': '-5'});
        jQuery('.PW_inner').hide();
    });
}


function showError(msg) {
    jQuery('.warning,.info,.success').css('display', 'none');
    jQuery('.error').html(msg).css('display', 'inline-block');
}

function showWarning(msg) {
    jQuery('.error,.info,.success').css('display', 'none');
    jQuery('.warning').html(msg).css('display', 'inline-block');
}

function showInfo(msg) {
    jQuery('.warning,.error,.success').css('display', 'none');
    jQuery('.info').html(msg).css('display', 'inline-block');
}

function showSuccess(msg) {
    jQuery('.warning,.info,.error').css('display', 'none');
    jQuery('.success').html(msg).css('display', 'inline-block');
}

function clearAllMessages() {
    jQuery('.warning,.info,.success,.error').css('display', 'none').html('');
}


// =================================================
// --- We make 'uc' our global backbone space.
// =================================================
var uc = {
    models: {},
    collections: {},
    commonFunctions: {},
    views: {}
};


if (window.Backbone) {

    uc.collections.PagedCollection = Backbone.Collection.extend({

        pageSize: 0,
        pageNumber: 0,
        totalPages: 0,
        totalRecords: 0,
        queryParameters: {},
        paginationParameters: {'pageSize': 'pageSize', 'pageNumber': 'pageNumber'},
        paginationHeaders: {
            'pageSize': 'uc-pagination-page-size',
            'pageNumber': 'uc-pagination-page-number',
            'totalPages': 'uc-pagination-total-pages',
            'totalRecords': 'uc-pagination-total-records'
        },

        'initialize': function () {
            var _url = this.url;
            this.url = function () {
                var pagedUrl = _.isFunction(_url) ? _url() : _url;
                if (this.queryParameters) {
                    if (pagedUrl.indexOf('?') > -1) {
                        pagedUrl += '&' + jQuery.param(this.queryParameters);
                    } else {
                        pagedUrl += '?' + jQuery.param(this.queryParameters);
                    }
                }
                return pagedUrl;
            }
        },

        'parse': function (resp, options) {

            var xhr = options.xhr;

            // check for the 3 pagination headers.
            var pageSize = parseInt(xhr.getResponseHeader(this.paginationHeaders['pageSize']), 10);
            if (isNaN(pageSize)) {
                pageSize = 0;
            }
            this.pageSize = pageSize;

            var pageNumber = parseInt(xhr.getResponseHeader(this.paginationHeaders['pageNumber']), 10);
            if (isNaN(pageNumber)) {
                pageNumber = 0;
            }
            this.pageNumber = pageNumber;

            var totalPages = parseInt(xhr.getResponseHeader(this.paginationHeaders['totalPages']), 10);
            if (isNaN(totalPages)) {
                totalPages = 0;
            }
            this.totalPages = totalPages;

            var totalRecords = parseInt(xhr.getResponseHeader(this.paginationHeaders['totalRecords']), 10);
            if (isNaN(totalRecords)) {
                totalRecords = 0;
            }
            this.totalRecords = totalRecords;


            return resp; // this single line is the default behavior.  everything above is custom page code.
        },

        'hasNext': function () {
            return this.totalPages && this.pageNumber && this.pageNumber < this.totalPages;
        },

        'hasPrev': function () {
            return this.pageNumber && this.pageNumber > 1;
        },

        'nextPage': function () {
            this.queryParameters[this.paginationParameters['pageNumber']] = this.pageNumber + 1;
            this.fetch();
        },

        'prevPage': function () {
            this.queryParameters[this.paginationParameters['pageNumber']] = this.pageNumber - 1;
            this.fetch();
        },

        'gotoPage': function (pageNo) {
            this.queryParameters[this.paginationParameters['pageNumber']] = pageNo;
            this.fetch();
        }


    });


// add a close method to the view that does remove AND unbind.  unbind only does dom.
// this is required for the AppView methods above to work, since they call this close() method to clean up bound events
    Backbone.View.prototype.close = function () {
        this.remove();
        this.unbind();
        // we'll also need to unbind from the model or collection, but that must be done individually.
        // so if the view has 'onClose' stubbed, call that too.
        if (this.onClose) {
            this.onClose();
        }
    };

}


// ---------------------------------------------------------------------
// --- common functions
// ---------------------------------------------------------------------


/**
 * This is a really useful function for extracting an oid from an html element id. For example, if you have a lot
 * of with this kind of id:   'checkbox{{oid}}', then this method can return that oid.
 * So, an id of 'salesCb1024' will return 1024
 * @param id the full html element id
 * @param prefix the prefix of characters before the oid
 */
uc.commonFunctions.parseOidFromId = function (id, prefix) {
    return id.substring(prefix.length);
};


/**
 * this method creates/returns a method. The returned method is hardcoded to do content switching on a particular panel
 * in the application.  The showView(view) method will be used often throughout this application to ensure that when
 * content is being updated, the old content is unbound from any event handlers to avoid zombie events.  Think of it
 * like a programming 'destructor' that frees up event binding.
 * @param pane an html element (using a div) id that is used to update content.
 */
uc.commonFunctions.createAppView = function (pane) {
    // notice!  the return value is a new function that is hardwired to operate on whatever element id is passed in.
    return new function () {
        var that = {};
        that.showView = function (view, modal, title, width) {
            if (this.currentView) {
                this.currentView.close();
            }

            this.currentView = view;
            this.currentView.render();

            if (modal) {
                ucLoadPopup2(
                    {
                        container: 'modalAppView',
                        title: title,
                        css: {'width': width},
                        content: this.currentView.el,
                        alwaysNew: true
                    });
            } else {
                jQuery("#" + pane).html(this.currentView.el);
            }
        };

        that.clearView = function () {
            if (this.currentView) {
                this.currentView.close();
            }

            jQuery("#" + pane).html('');
        };

        return that;
    };
};


uc.commonFunctions.parseHttpParameters = function () {
    var result = {};
    var searchString = window.location.search.substring(1), params = searchString.split("&");
    for (var i = 0; i < params.length; i++) {
        var kv = params[i].split("=");
        var name = kv[0].toLowerCase(), value = decodeURIComponent(kv[1]);

        if (!result.hasOwnProperty(name)) {
            result[name] = [];
        }
        result[name].push(value);

    }
    return result;
};

function logout(event) {
    event.stopPropagation();

    //noinspection JSUnusedLocalSymbols
    ultracart.myAccount.logout({
        success: function (account) {
            showSuccess("You were successfully logged out of your account.");
            location.href = 'index.html';
        },
        failure: function (textStatus, errorThrown) {
            showError("Logout failed.  Please refresh this page.");
        }
    });

    return false;
}

jQuery(document).ready(function () {
    jQuery('.nav-logout a').bind('click', logout);
});
