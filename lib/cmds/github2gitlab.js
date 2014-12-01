/*
 * Copyright 2013, All Rights Reserved.
 *
 * Code licensed under the BSD License:
 * https://github.com/node-gh/gh/blob/master/LICENSE.md
 *
 * @author Author <email@email.com>
 */

'use strict';

// -- Requires -------------------------------------------------------------------------------------

var async = require('async'),
    base = require('../base'),
    git = require('../git'),
    logger = require('../logger'),
    openUrl = require('open'),
    Gitlab = require('gitlab'),
    Issues = require('./issue').Impl,
    config = base.getConfig();

// -- Constructor ----------------------------------------------------------------------------------

function Github2Gitlab(options) {
    this.options = options;
}

// -- Constants ------------------------------------------------------------------------------------

Github2Gitlab.DETAILS = {
    alias: 'gg',
    description: 'Gitlab2Github',
    commands: [
        'pr'
    ],
    options: {
        'number': [String, Array],
        'repo': String,
        'user': String
    },
    shorthands: {
        'r': ['--repo'],
        'n': ['--number'],
        'u': ['--user']
    },
    payload: function(payload, options) {
        options.pr = true;
    }
};

// -- Commands -------------------------------------------------------------------------------------

Github2Gitlab.prototype.run = function() {
    var instance = this,
        options = instance.options;

    if (options.pr) {
        instance.pr();
    }
};

Github2Gitlab.prototype.pr = function() {
    var instance = this,
        options = instance.options,
        headBranch,
        operations,
        pull,
        repoUrl;

    operations = [

        function(callback) {
            instance.getPullRequest_(function(err, data) {
                if (!err) {
                    pull = data;
                    logger.log('pull ' + JSON.stringify(pull));
                    headBranch = pull.head.ref;
                    repoUrl = pull.head.repo.ssh_url;
                }
                callback(err);
            });
        },
        function(callback) {
            git.exec('fetch', ['origin', '+refs/pull/*:refs/pull/*'], function(status,
                err) {
                callback(err);
            });
        },
        function(callback) {
            git.exec('push', ['gitlab', '+refs/pull/' + pull.number + '/head:refs/heads/' + pull.head.ref], function(status,
                err) {
                callback(err);
            });
        },
        function(callback) {
            logger.log(" gitlab project_id " + pull.base.repo.full_name);
            var gitlab = Gitlab({
                url:   config.gitlab_url,
                token: config.gitlab_token
            });
            logger.log('create the gitlab pull request now');
            gitlab.projects.merge_requests.add(pull.base.repo.full_name, pull.head.ref, pull.base.ref, 1, pull.title, function(data) {
                logger.log("merge request result " + JSON.stringify(data));
            });
            logger.log('created');
        }
    ];

    async.series(operations);
};

Github2Gitlab.prototype.getPullRequest_ = function(opt_callback) {
    var instance = this,
        options = instance.options,
        payload;

    payload = {
        number: options.number,
        repo: options.repo,
        user: options.user
    };

    base.github.pullRequests.get(payload, opt_callback);
};

exports.Impl = Github2Gitlab;
