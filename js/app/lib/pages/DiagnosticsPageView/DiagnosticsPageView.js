/*
 * Copyright (c) 2013 DataTorrent, Inc. ALL Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var _ = require('underscore');
var Notifier = DT.lib.Notifier;
var kt = require('knights-templar');
var BaseView = require('bassview');

var IssuesSubView = require('./IssuesSubView');
var InfoSubView = require('./InfoSubView');

var DiagnosticsPageView = BaseView.extend({

    initialize: function(options) {
        
        this.subview('issues', new IssuesSubView({}));
        this.subview('info', new InfoSubView({}));
    },

    render: function() {
        var json = {};
        var html = this.template(json);
        this.$el.html(html);
        this.assign({
            '.diagnostic-issues': 'issues',
            '.diagnostic-info': 'info'
        });
        return this;
    },

    template: kt.make(__dirname+'/DiagnosticsPageView.html')

});

exports = module.exports = DiagnosticsPageView;