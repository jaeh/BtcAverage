var Q = require('q');
var request = require('request');
var async = require('async');
var smartaverage = require('smartaverage');
var providers = require('./providers');

var TIMEOUT = 5000;
var ACCEPTABLE_VARIANCE = 3;
var MINIMUM_VALUES_VARIANCE = 3;

/**
 * FIND VALUE BY PATH
 *
 * @param {Object} jsonData
 * @param {String} path
 */
function findValueByPath(jsonData, path){
    var errorParts = false;
    path.split('.').forEach(function(part){
        if(!errorParts){
            jsonData = jsonData[part];
            if(!jsonData) errorParts = true;
        }
    });
    return errorParts ? 0 : parseFloat(jsonData);
}

/**
 * GET PRICE FROM API SERVICE
 *
 * @param {String} urlAPI
 * @param {Function} callback
 */
function requestPrice(urlAPI, callback){
    request({
        method: 'GET',
        url: urlAPI,
        timeout: TIMEOUT
    }, function(error, res, body){
        if(!error){
            try{
                var current = JSON.parse(body);
                callback(current);
            }catch(e){}
        }
        if(!current) {
            callback({});
        }
    });
}

/**
 * GET PRICE
 */
module.exports = function getPrice(options){
    var df = Q.defer();
    if ( options && typeof options.TIMEOUT === Number && options.TIMEOUT > 0) {
        TIMEOUT = options.TIMEOUT;
    }
    async.parallel(providers.map(function(provider){
            return function(callback){
                requestPrice(provider.url, function(jsonResponse){
                    callback(null, findValueByPath(jsonResponse, provider.path));
                });
            }
        }),
        function(err, prices){
            var infoAverage = smartaverage(ACCEPTABLE_VARIANCE, MINIMUM_VALUES_VARIANCE, prices);
            if(infoAverage){
                var pricesProviders = {};
                prices.forEach(function(price, i){
                    pricesProviders[providers[i].name] = price;
                });
                df.resolve({
                    average: infoAverage.average,
                    pricesAverage: infoAverage.dataset,
                    prices: pricesProviders
                });
            }else{
                df.reject(new Error('Was imposible get price average'));
            }
        });
    return df.promise;
};
