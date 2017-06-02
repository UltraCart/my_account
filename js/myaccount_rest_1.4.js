var restUrl = 'https://api.ultracart.com/rest/myaccount';
var restCartUrl = 'https://api.ultracart.com/rest/cart'; // only needed for the add wishlist item to cart routine.
var merchantId = 'DEMO'; // you should change this.


// handlebars helpers
Handlebars.registerHelper('checkedIfTheseAreEqual', function (value, target, options) {
    var checkboxHtml = options.fn(this); // this will evaluate the block inside this helper and return the output.
    // find the /> and insert selected='selected' if valid.
    if (value && target && value === target) {
        checkboxHtml = checkboxHtml.replace("/>", " checked='checked'/>");
    }
    return checkboxHtml;
});

function getCookie(k) {
    var v = document.cookie.match('(^|;) ?' + k + '=([^;]*)(;|$)');
    return v ? v[2] : null;
}

function createHeadersFromCookies() {

    var cartId = getCookie('UltraCartShoppingCartID');
    var merchantId = window.merchantId || getCookie('UltraCartMerchantID');

    return {
        'X-UC-Merchant-Id': merchantId,
        'X-UC-Shopping-Cart-Id': cartId,
        "cache-control": "no-cache"
    };

}


Handlebars.registerHelper('compare', function (lvalue, rvalue, options) {

    if (arguments.length < 3)
        throw new Error("Handlebars Helper 'compare' needs 2 parameters");

    operator = options.hash.operator || "==";

    var operators = {
        '==': function (l, r) {
            return l === r;
        },
        '===': function (l, r) {
            return l === r;
        },
        '!=': function (l, r) {
            return l !== r;
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
            return typeof l === r;
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
 * ucSelectOption2 takes a target value to compare
 */
Handlebars.registerHelper('createSelectOption', function (value, target, options) {
    var html = "<option value='" + Handlebars.Utils.escapeExpression(value) + "'";
    if (value && target && value === target) {
        html += " selected='selected'";
    }
    html += ">" + Handlebars.Utils.escapeExpression(options.fn(this)) + "</option>";
    return html;
});


// requires jQuery 1.7.2+
// requires JSON (json2.js is a nice one...)

// create the ultracart namespace if needed
if (typeof ultracart === 'undefined') {
    ultracart = {};
}


ultracart.MyAccount = function (merchantId) {
    this.merchantId = merchantId;

    /**
     * checks to see if the user is logged to the system.
     * @param [options] success and failure callbacks
     * @return if no callbacks specified, returns null if not logged in, else returns settings.
     */
    this.loggedIn = function (options) {

        options = options || {};

        var settings = null;

        jQuery.ajax({
            url: restUrl + '/loggedIn',
            type: 'get',
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json'
        }).done(function (result) {
            if (result && result.email) {
                settings = result;
            } else {
                settings = null; // if the result is an empty object, then customer is not logged in.
            }
            if (options.success) {
                options.success(settings);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });


        return settings;
    };


    /**
     * logs into the UltraCart system.  Sets two cookies to allow for invisible authenticated transactions hereafter.
     * @param email the email address of the customer
     * @param password the password of the customer
     * @param [options] success and failure callbacks
     * @return if no callbacks specified, this returns back an Account object (on success), else null
     */
    this.login = function (email, password, options) {

        options = options || {};

        var credentials = {merchantId: merchantId, email: email, password: password};
        var account = null;

        jQuery.ajax({
            url: restUrl + '/login',
            data: JSON.stringify(credentials),
            type: 'post',
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            contentType: 'application/json; charset=UTF-8',
            cache: false,
            dataType: 'json'
        }).done(function (result) {
            account = result;
            if (options.success) {
                options.success(account);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return account;
    };


    /**
     * logs out a customer.
     * @param [options] success and failure callbacks
     * @return if no callbacks specified, this returns back a Cart object if one exists (on success), else null.  The reason
     * it returns back a cart object is because if the customer has a cart going, it's still valid, even if they log out,
     * so this return value would be an updated cart (prices may change, etc).
     */
    this.logout = function (options) {

        options = options || {};

        // even if logged out, there may be a shopping cart, so return that cart if it's returned from the server.
        var cart = null;

        jQuery.ajax({
            url: restUrl + '/logout',
            type: 'get',
            headers: createHeadersFromCookies(),
            async: !!(options.success || options.failure),
            cache: false,
            dataType: 'json'
        }).done(function (result) {
            cart = result;
            if (options.success) {
                options.success(cart);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return cart;
    };


    /**
     * updates an account password.  customer must be logged in.  new password must be 30 characters or less.
     * this method does not return anything on success.
     * @param oldPassword  the old password
     * @param newPassword the new password
     * @param [options] success and failure callbacks
     */
    this.changePassword = function (oldPassword, newPassword, options) {

        options = options || {};

        jQuery.ajax({
            url: restUrl + '/changePassword',
            data: JSON.stringify({oldPassword: oldPassword, newPassword: newPassword}),
            type: 'post',
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            contentType: 'application/json; charset=UTF-8',
            dataType: 'json'
        }).done(function () {
            if (options.success) {
                options.success();
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

    };


    /**
     * emails their password to a customer.
     @param email the email address of the customer
     * @param [options] success and failure callbacks
     * @returns a success or failure message if no callbacks defined

     */
    this.forgotPassword = function (email, options) {

        var msg = null;

        options = options || {};

        jQuery.ajax({
            url: restUrl + '/forgotPassword',
            data: JSON.stringify(email),
            type: 'post',
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            contentType: 'application/json; charset=UTF-8',
            dataType: 'text'
        }).done(function (result) {
            msg = result;
            if (options.success) {
                options.success(result);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                msg = errorThrown;
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return msg;
    };


    /**
     * returns back the basic account settings.
     * @param [options] success and failure callbacks
     * @return if no callbacks specified, this returns back an Account object (on success), else null
     */
    this.getSettings = function (options) {

        options = options || {};

        var account = null;

        jQuery.ajax({
            url: restUrl + '/settings',
            type: 'get',
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json'
        }).done(function (result) {
            account = result;
            if (options.success) {
                options.success(account);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return account;

    };


    /**
     * creates an account.  this cannot be done if a customer is currently logged in.
     * @param customerInformation
     * @param [options] success and failure callbacks
     * @return if no callbacks specified, this returns back an Account object (on success), else null
     */
    this.createAccount = function (customerInformation, options) {

        options = options || {};

        if (!customerInformation) {
            customerInformation = {}; // this will still fail, but will fail gracefully
        }
        if (!customerInformation.hasOwnProperty('merchantId')) {
            customerInformation['merchantId'] = this.merchantId;
        }

        var msg = null;

        var params = null;
        if (options.redirectUrl) {
            params = 'redirectUrl=' + encodeURIComponent(options.redirectUrl);
        }
        if (options.themeCode) {
            params = (params !== null ? (params + '&') : '');
            params += 'themeCode=' + encodeURIComponent(options.themeCode);
        }

        jQuery.ajax({
            url: restUrl + '/settings' + (params !== null ? ('?' + params) : ''),
            data: JSON.stringify(customerInformation),
            type: 'post',
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            contentType: 'application/json; charset=UTF-8',
            dataType: 'json'
        }).done(function (result) {
            msg = result.message;
            if (options.success) {
                options.success(msg);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return msg;
    };


    /**
     * updates an account.  merchant id, email, and password cannot be updated here.
     * @param changes
     * @param [options] success and failure callbacks
     * @return if no callbacks specified, this returns back an Account object (on success), else null
     */
    this.updateSettings = function (changes, options) {

        options = options || {};

        var account = null;

        jQuery.ajax({
            url: restUrl + '/settings',
            data: JSON.stringify(changes),
            type: 'put',
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            contentType: 'application/json; charset=UTF-8',
            dataType: 'json'
        }).done(function (result) {
            account = result;
            if (options.success) {
                options.success(account);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return account;
    };


    /**
     * deletes a customer account.  this method returns nothing, so callbacks receive nothing as well.
     * @param [options] success and failure callbacks
     */
    this.deleteAccount = function (options) {

        options = options || {};

        jQuery.ajax({
            url: restUrl + '/settings',
            type: 'delete',
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json'
        }).done(function () {
            if (options.success) {
                options.success();
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

    };


    /**
     * returns back an array of all shipping addresses
     * @param [options] success and failure callbacks
     * @return Array no callbacks specified, this returns back an array of shipping addresses (on success), else null
     */
    this.getShippingAddresses = function (options) {

        options = options || {};

        var addresses = [];

        jQuery.ajax({
            url: restUrl + '/shippingAddresses',
            type: 'get',
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json'
        }).done(function (result) {
            addresses = result;
            if (options.success) {
                options.success(addresses);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return addresses;

    };


    /**
     * returns back a shipping address
     * @param id the shipping address id (oid)
     * @param [options] success and failure callbacks
     * @return Array no callbacks specified, this returns back a shipping address (on success), else null

     */
    this.getShippingAddress = function (id, options) {

        options = options || {};

        var address = null;

        jQuery.ajax({
            url: restUrl + '/shippingAddresses/' + id,
            type: 'get',
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json'
        }).done(function (result) {
            address = result;
            if (options.success) {
                options.success(address);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return address;

    };


    /**
     * @param address the address to be inserted
     * adds an address to the shipping address book
     * @param [options] success and failure callbacks
     * @return Object the address object with the updated oid (object identifier), unless callbacks

     */
    this.insertShippingAddress = function (address, options) {

        options = options || {};
        var insertedAddress = null; // will contain oid

        jQuery.ajax({
            url: restUrl + '/shippingAddresses',
            type: 'post',
            data: JSON.stringify(address),
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            contentType: 'application/json; charset=UTF-8',
            dataType: 'json'
        }).done(function (result) {
            insertedAddress = result;
            if (options.success) {
                options.success(insertedAddress);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return insertedAddress;

    };


    /**
     * @param address the address to be updated
     * updates an address in the shipping address book
     * @param [options] success and failure callbacks
     * @returns Object the address object returned from the server (some fields may have been truncated due to length requirements, etc)
     */
    this.updateShippingAddress = function (address, options) {

        options = options || {};
        var updatedAddress = null;

        jQuery.ajax({
            url: restUrl + '/shippingAddresses/' + address.id,
            type: 'put',
            data: JSON.stringify(address),
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            contentType: 'application/json; charset=UTF-8',
            dataType: 'json'
        }).done(function (result) {
            updatedAddress = result;
            if (options.success) {
                options.success(updatedAddress);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return updatedAddress;

    };


    /**
     * @param address the address to be deleted
     * deletes an address in the shipping address book
     * @param [options] success and failure callbacks
     */
    this.deleteShippingAddress = function (address, options) {

        options = options || {};

        jQuery.ajax({
            url: restUrl + '/shippingAddresses/' + address.id,
            type: 'delete',
            data: JSON.stringify(address),
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            contentType: 'application/json; charset=UTF-8',
            dataType: 'json'
        }).done(function () {
            if (options.success) {
                options.success();
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

    };


    /**
     * returns back an array of all billing addresses
     * @param [options] success and failure callbacks
     * @return Array no callbacks specified, this returns back an array of billing addresses (on success), else null
     */
    this.getBillingAddresses = function (options) {

        options = options || {};

        var addresses = [];

        jQuery.ajax({
            url: restUrl + '/billingAddresses',
            type: 'get',
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json'
        }).done(function (result) {
            addresses = result;
            if (options.success) {
                options.success(addresses);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return addresses;

    };


    /**
     * returns back a billing address
     * @param id the billing address id (oid)
     * @param [options] success and failure callbacks
     * @return Array no callbacks specified, this returns back a billing address (on success), else null

     */
    this.getBillingAddress = function (id, options) {

        options = options || {};

        var address = null;

        jQuery.ajax({
            url: restUrl + '/billingAddresses/' + id,
            type: 'get',
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json'
        }).done(function (result) {
            address = result;
            if (options.success) {
                options.success(address);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return address;

    };


    /**
     * @param address the address to be inserted
     * adds an address to the billing address book
     * @param [options] success and failure callbacks
     * @return Object the address object with the updated oid (object identifier), unless callbacks

     */
    this.insertBillingAddress = function (address, options) {

        options = options || {};
        var insertedAddress = null; // will contain oid

        jQuery.ajax({
            url: restUrl + '/billingAddresses',
            type: 'post',
            data: JSON.stringify(address),
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            contentType: 'application/json; charset=UTF-8',
            dataType: 'json'
        }).done(function (result) {
            insertedAddress = result;
            if (options.success) {
                options.success(insertedAddress);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return insertedAddress;

    };


    /**
     * @param address the address to be updated
     * updates an address in the billing address book
     * @param [options] success and failure callbacks
     * @returns Object the address object returned from the server (some fields may have been truncated due to length requirements, etc)
     */
    this.updateBillingAddress = function (address, options) {

        options = options || {};
        var updatedAddress = null;

        jQuery.ajax({
            url: restUrl + '/billingAddresses/' + address.id,
            type: 'put',
            data: JSON.stringify(address),
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            contentType: 'application/json; charset=UTF-8',
            dataType: 'json'
        }).done(function (result) {
            updatedAddress = result;
            if (options.success) {
                options.success(updatedAddress);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return updatedAddress;

    };


    /**
     * @param address the address to be deleted
     * deletes an address in the billing address book
     * @param [options] success and failure callbacks
     */
    this.deleteBillingAddress = function (address, options) {

        options = options || {};

        jQuery.ajax({
            url: restUrl + '/billingAddresses/' + address.id,
            type: 'delete',
            data: JSON.stringify(address),
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            contentType: 'application/json; charset=UTF-8',
            dataType: 'json'
        }).done(function () {
            if (options.success) {
                options.success();
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

    };


    /**
     * returns back an array of all credit cards (with masked numbers)
     * @param [options] success and failure callbacks
     * @return Array no callbacks specified, this returns back an array of credit cards (on success), else null
     */
    this.getCreditCards = function (options) {

        options = options || {};

        var creditCards = [];

        jQuery.ajax({
            url: restUrl + '/creditCards',
            type: 'get',
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json'
        }).done(function (result) {
            creditCards = result;
            if (options.success) {
                options.success(creditCards);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return creditCards;

    };


    /**
     * returns back a credit card (number masked)
     * @param id the credit card id (oid)
     * @param [options] success and failure callbacks
     * @return Array no callbacks specified, this returns back a credit card (on success), else null

     */
    this.getCreditCard = function (id, options) {

        options = options || {};

        var creditCard = null;

        jQuery.ajax({
            url: restUrl + '/creditCards/' + id,
            type: 'get',
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json'
        }).done(function (result) {
            creditCard = result;
            if (options.success) {
                options.success(creditCard);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return creditCard;

    };


    /**
     * @param creditCard the creditCard to be inserted
     * adds a credit card to the customer's payments
     * @param [options] success and failure callbacks
     * @return Object the credit card object with the updated oid (object identifier), unless callbacks

     */
    this.insertCreditCard = function (creditCard, options) {

        options = options || {};
        var insertedCard = null; // will contain oid

        jQuery.ajax({
            url: restUrl + '/creditCards',
            type: 'post',
            data: JSON.stringify(creditCard),
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            contentType: 'application/json; charset=UTF-8',
            dataType: 'json'
        }).done(function (result) {
            insertedCard = result;
            if (options.success) {
                options.success(insertedCard);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, jqXHR, textStatus, errorThrown);
                }
            });

        return insertedCard;

    };


    /**
     * @param creditCard the creditCard to be updated
     * updates a credit card in the customer's payments
     * @param [options] success and failure callbacks
     * @returns Object the credit card returned from the server (shouldn't be any different, perhaps the timestamp)
     */
    this.updateCreditCard = function (creditCard, options) {

        options = options || {};
        var updatedCard = null;

        jQuery.ajax({
            url: restUrl + '/creditCards/' + creditCard.id,
            type: 'put',
            data: JSON.stringify(creditCard),
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            contentType: 'application/json; charset=UTF-8',
            dataType: 'json'
        }).done(function (result) {
            updatedCard = result;
            if (options.success) {
                options.success(updatedCard);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return updatedCard;

    };


    /**
     * @param creditCard the creditCard to delete
     * deletes a credit card in the customer's payment list
     * @param [options] success and failure callbacks
     */
    this.deleteCreditCard = function (creditCard, options) {

        options = options || {};

        jQuery.ajax({
            url: restUrl + '/creditCards/' + creditCard.id,
            type: 'delete',
            data: JSON.stringify(creditCard),
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            contentType: 'application/json; charset=UTF-8',
            dataType: 'json'
        }).done(function () {
            if (options.success) {
                options.success();
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(textStatus, errorThrown);
                }
            });

    };


    /**
     * returns back pagination of orders, the success callback will
     * receive 1) orders, 2) pagination object (pageSize,pageNumber,totalRecords,totalPages)
     * @param [options] success and failure callbacks, 'pageNumber' and 'pageSize'
     * @return Object no callbacks specified, this returns back an object containing 'orders' and 'pagination' of orders (on success), else null
     */
    this.getOrders = function (options) {

        options = options || {};


        var data = {};
        data['pageNumber'] = options.pageNumber || '';
        data['pageSize'] = options.pageSize || '';
//    data['searchString'] = options.search || '';
        data['_filterTime'] = options.filter || '';

        var orders = [];
        var pagination = {};

        jQuery.ajax({
            url: restUrl + '/orders',
            type: 'get',
            data: data,
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json'
        }).done(function (result, textStatus, jqXHR) {
            orders = result;
            pagination['pageSize'] = parseInt(jqXHR.getResponseHeader('uc-pagination-page-size'));
            pagination['pageNumber'] = parseInt(jqXHR.getResponseHeader('uc-pagination-page-number'));
            pagination['totalRecords'] = parseInt(jqXHR.getResponseHeader('uc-pagination-total-records'));
            pagination['totalPages'] = parseInt(jqXHR.getResponseHeader('uc-pagination-total-pages'));

            if (options.success) {
                options.success(orders, pagination);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(textStatus, errorThrown);
                }
            });

        return {orders: orders, pagination: pagination};

    };


    /**
     * returns an order,
     * @param orderId the order to retrieve
     * @param [options] success and failure callbacks
     * @return Object if no callbacks specified, this returns back an order, else null

     */
    this.getOrder = function (orderId, options) {

        options = options || {};


        var order = null;

        jQuery.ajax({
            url: restUrl + '/orders/' + orderId,
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json'
        }).done(function (result) {
            order = result;
            if (options.success) {
                options.success(order);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(textStatus, errorThrown);
                }
            });

        return order;
    };


    /**
     * returns a list of order tracking information,
     * @param orderId the order to retrieve
     * @param [options] success and failure callbacks
     * @return Object if no callbacks specified, this returns back a list of order tracking, else null

     */
    this.getOrderTracking = function (orderId, options) {

        options = options || {};

        var tracking = null;

        jQuery.ajax({
            url: restUrl + '/orders/' + orderId + "/tracking",
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json'
        }).done(function (result) {
            tracking = result;
            if (options.success) {
                options.success(tracking);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(textStatus, errorThrown);
                }
            });

        return tracking;
    };


    /**
     * returns back pagination of NotReviewedItem items, the success callback will
     * receive 1) review items, 2) pagination object (pageSize,pageNumber,totalRecords,totalPages)
     * @param [options] success and failure callbacks, 'pageNumber' and 'pageSize'
     * @return Object no callbacks specified, this returns back an object containing 'notYetReviewed' and 'pagination' of records (on success), else null
     */
    this.getNotReviewedYet = function (options) {

        options = options || {};

        var data = {};
        data['pageNumber'] = options.pageNumber || '';
        data['pageSize'] = options.pageSize || '';

        var notReviewedYet = [];
        var pagination = {};

        jQuery.ajax({
            url: restUrl + '/notReviewedYet',
            type: 'get',
            data: data,
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json'
        }).done(function (result, textStatus, jqXHR) {
            notReviewedYet = result;
            pagination['pageSize'] = parseInt(jqXHR.getResponseHeader('uc-pagination-page-size'));
            pagination['pageNumber'] = parseInt(jqXHR.getResponseHeader('uc-pagination-page-number'));
            pagination['totalRecords'] = parseInt(jqXHR.getResponseHeader('uc-pagination-total-records'));
            pagination['totalPages'] = parseInt(jqXHR.getResponseHeader('uc-pagination-total-pages'));

            if (options.success) {
                options.success(notReviewedYet, pagination);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(textStatus, errorThrown);
                }
            });

        return {notReviewedYet: notReviewedYet, pagination: pagination};

    };


    /**
     * returns back pagination of ReviewedItem items, the success callback will
     * receive 1) review items, 2) pagination object (pageSize,pageNumber,totalRecords,totalPages)
     * @param [options] success and failure callbacks, 'pageNumber' and 'pageSize'
     * @return Object no callbacks specified, this returns back an object containing 'reviews' and 'pagination' of records (on success), else null
     */
    this.getReviews = function (options) {

        options = options || {};

        var data = {};
        data['pageNumber'] = options.pageNumber || '';
        data['pageSize'] = options.pageSize || '';
        data['thumbnailWidth'] = options.thumbnailWidth || 80;
        data['thumbnailHeight'] = options.thumbnailHeight || 80;
        data['thumbnailSquare'] = options.thumbnailSquare || 'true';

        var reviews = [];
        var pagination = {};

        jQuery.ajax({
            url: restUrl + '/reviews',
            type: 'get',
            data: data,
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json'
        }).done(function (result, textStatus, jqXHR) {
            reviews = result;
            pagination['pageSize'] = parseInt(jqXHR.getResponseHeader('uc-pagination-page-size'));
            pagination['pageNumber'] = parseInt(jqXHR.getResponseHeader('uc-pagination-page-number'));
            pagination['totalRecords'] = parseInt(jqXHR.getResponseHeader('uc-pagination-total-records'));
            pagination['totalPages'] = parseInt(jqXHR.getResponseHeader('uc-pagination-total-pages'));

            if (options.success) {
                options.success(reviews, pagination);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR);
                console.log(textStatus);
                console.log(errorThrown);
                if (options.failure) {
                    options.failure(textStatus, errorThrown);
                }
            });

        return {reviews: reviews, pagination: pagination};

    };


    this.getOrderCase = function (orderId, options) {

        options = options || {};

        var orderCase = null;

        jQuery.ajax({
            url: restUrl + '/orders/' + orderId + "/case",
            type: 'get',
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json'
        }).done(function (result) {
            if (result && result.caseOid) {
                orderCase = result;
            }
            if (options.success) {
                options.success(orderCase);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return orderCase;

    };


    this.insertOrderCase = function (orderId, orderCase, options) {

        options = options || {};

        jQuery.ajax({
            url: restUrl + '/orders/' + orderId + "/case",
            data: JSON.stringify(orderCase),
            type: 'post',
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json',
            contentType: 'application/json; charset=UTF-8'
        }).done(function (result) {
            if (result) {
                orderCase = result;
            }
            if (options.success) {
                options.success(orderCase);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return orderCase;

    };


    this.getOrderCaseMessages = function (orderId, options) {

        options = options || {};

        var messages = [];

        jQuery.ajax({
            url: restUrl + '/orders/' + orderId + "/case/messages",
            type: 'get',
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json'
        }).done(function (result) {
            if (result) {
                messages = result;
            }
            if (options.success) {
                options.success(messages);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return messages;

    };


    /**
     * inserts a message into an existing case, thereby sending an email to customer service.
     * @param orderId the order for the case
     * @param messageText the message body.  The actual object is created within this function
     * @param [options] success and failure callbacks
     * @return Object the newly created message
     */
    this.insertOrderCaseMessage = function (orderId, messageText, options) {

        options = options || {};

        var orderCaseMessage = {message: messageText}; // this is all that's needed to insert message.

        jQuery.ajax({
            url: restUrl + '/orders/' + orderId + "/case/messages",
            data: JSON.stringify(orderCaseMessage),
            type: 'post',
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json',
            contentType: 'application/json; charset=UTF-8'
        }).done(function (result) {
            if (result) {
                orderCaseMessage = result;
            }
            if (options.success) {
                options.success(orderCaseMessage);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return orderCaseMessage;

    };


    /**
     * returns back pagination of the wish list, the success callback will
     * receive 1) wish list, 2) pagination object (pageSize,pageNumber,totalRecords,totalPages)
     * @param [options] success and failure callbacks, 'pageNumber' and 'pageSize'
     * @return Object no callbacks specified, this returns back an object containing 'wishlist' and 'pagination' of wish list (on success), else null
     */
    this.getWishlist = function (options) {

        options = options || {};


        var data = {};
        data['pageNumber'] = options.pageNumber || '';
        data['pageSize'] = options.pageSize || '';
        data['thumbnailWidth'] = options.thumbnailWidth || '';
        data['thumbnailHeight'] = options.thumbnailWidth || '';
        data['thumbnailSquare'] = options.thumbnailSquare || '';
        data['sortBy'] = options.sortBy || '';

        var wishlist = [];
        var pagination = {};

        jQuery.ajax({
            url: restUrl + '/wishlist',
            type: 'get',
            data: data,
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json'
        }).done(function (result, textStatus, jqXHR) {
            wishlist = result;
            pagination['pageSize'] = parseInt(jqXHR.getResponseHeader('uc-pagination-page-size'));
            pagination['pageNumber'] = parseInt(jqXHR.getResponseHeader('uc-pagination-page-number'));
            pagination['totalRecords'] = parseInt(jqXHR.getResponseHeader('uc-pagination-total-records'));
            pagination['totalPages'] = parseInt(jqXHR.getResponseHeader('uc-pagination-total-pages'));

            if (options.success) {
                options.success(wishlist, pagination);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(textStatus, errorThrown);
                }
            });

        return {wishlist: wishlist, pagination: pagination};

    };


    /**
     * returns a wish list item,
     * @param wishlistOid the unique id for a wish list item
     * @param [options] success and failure callbacks
     * @return Object if no callbacks specified, this returns back an wish list item, else null

     */
    this.getWishlistItem = function (wishlistOid, options) {

        options = options || {};


        var wishlistItem = null;

        jQuery.ajax({
            url: restUrl + '/wishlist/' + wishlistOid,
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json'
        }).done(function (result) {
            wishlistItem = result;
            if (options.success) {
                options.success(wishlistItem);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(textStatus, errorThrown);
                }
            });

        return wishlistItem;
    };


    /**
     * @param wishlistOid the unique identifier of the wish list item to be deleted
     * deletes a wish list item in the wish list
     * @param [options] success and failure callbacks
     */
    this.deleteWishlistItem = function (wishlistOid, options) {

        options = options || {};

        jQuery.ajax({
            url: restUrl + '/wishlist/' + wishlistOid,
            type: 'delete',
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json'
        }).done(function () {
            if (options.success) {
                options.success();
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

    };


    /**
     * @param wishlistItem the wish list item to be inserted
     * adds a wish list item to the wish list
     * @param [options] success and failure callbacks
     * @return Object the wishlistItem object with the updated oid (object identifier), unless callbacks

     */
    this.insertWishlistItem = function (wishlistItem, options) {

        options = options || {};
        var insertedWishlistItem = null; // will contain oid when populated

        jQuery.ajax({
            url: restUrl + '/wishlist',
            type: 'post',
            data: JSON.stringify(wishlistItem),
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            contentType: 'application/json; charset=UTF-8',
            dataType: 'json'
        }).done(function (result) {
            insertedWishlistItem = result;
            if (options.success) {
                options.success(insertedWishlistItem);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return insertedWishlistItem;

    };


    /**
     * @param wishlistItem the wish list item to be updated
     * updates a wish list item in the wish list
     * @param [options] success and failure callbacks
     * @returns Object returns the same object passed since the server doesn't update the object in any way because
     * the only fields that can be updated are priority and comments.
     */
    this.updateWishlistItem = function (wishlistItem, options) {

        options = options || {};
        //noinspection JSUnusedLocalSymbols
        var updatedWishlistItem = wishlistItem;  // notice: in == out

        jQuery.ajax({
            url: restUrl + '/wishlist/' + wishlistItem.wishlistOid,
            type: 'put',
            data: JSON.stringify(wishlistItem),
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            contentType: 'application/json; charset=UTF-8',
            dataType: 'json'
        }).done(function (result) {
//              updatedWishlistItem = result;
            if (options.success) {
                options.success(updatedWishlistItem);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return updatedWishlistItem;
    };


    /**
     * @param itemId the item to be added to the cart.
     * adds an item to the shopping cart.
     * @param [options] success and failure callbacks
     */
    this.addWishlistItemToCart = function (itemId, options) {

        jQuery.ajax({
            url: restCartUrl,
            headers: createHeadersFromCookies(),
            dataType: 'json'
        }).done(function (cart) {
            if (!cart.items) {
                cart.items = [];
            }
            cart.items.push({'itemId': itemId, 'quantity': 1});

            jQuery.ajax({
                url: '/rest/cart',
                type: 'PUT', // Notice
                headers: createHeadersFromCookies(),
                contentType: 'application/json; charset=UTF-8',
                data: JSON.stringify(cart),
                dataType: 'json'
            }).done(function (updatedCart) {
                if (options.success) {
                    options.success(updatedCart);
                }
            })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    if (options.failure) {
                        options.failure(jqXHR, textStatus, errorThrown);
                    }
                });

        });


    };


    /**
     * returns an item review,
     * @param itemId the item id of the item to be reviewed.
     * @param [options] success and failure callbacks
     * @return Object if no callbacks specified, this returns back an item review, else null

     */
    this.getReview = function (itemId, options) {

        options = options || {};


        var itemReview = null;

        jQuery.ajax({
            // this will fail if someone puts crazy stuff in their item ids...
            url: restUrl + '/reviews/' + itemId,
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            dataType: 'json'
        }).done(function (result) {
            itemReview = result;
            if (options.success) {
                options.success(itemReview);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(textStatus, errorThrown);
                }
            });

        return itemReview;
    };


    /**
     * @param itemReview the item review to be updated
     * updates an item review in the database
     * @param [options] success and failure callbacks
     * @returns Object returns the itemReview object
     */
    this.updateReview = function (itemReview, options) {

        options = options || {};
        //noinspection JSUnusedLocalSymbols
        var updatedItemReview = null;

        jQuery.ajax({
            url: restUrl + '/reviews/' + itemReview.itemId,
            type: 'put',
            data: JSON.stringify(itemReview),
            async: !!(options.success || options.failure),
            headers: createHeadersFromCookies(),
            cache: false,
            contentType: 'application/json; charset=UTF-8',
            dataType: 'json'
        }).done(function (result) {
            updatedItemReview = result;
            if (options.success) {
                options.success(updatedItemReview);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (options.failure) {
                    options.failure(jqXHR, textStatus, errorThrown);
                }
            });

        return updatedItemReview;
    };


};

ultracart.myAccount = new ultracart.MyAccount(merchantId);