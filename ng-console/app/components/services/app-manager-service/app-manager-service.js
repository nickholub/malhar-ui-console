/*
 * Copyright (c) 2014 DataTorrent, Inc. ALL Rights Reserved.
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

'use strict';

angular.module('app.components.services.appManager', [
  'app.components.services.getUri',
  'app.components.services.text',
  'ui.bootstrap.modal'
])
.service('appManager', function($http, getUri, $modal, DtText) {
  return {

    /**
     * Ends an application with either a "kill"
     * signal or a "shutdown" signal
     * 
     * @param  {String} signal The end signal, either "kill" or "shutdown"
     * @param  {Object} app    POJO object of application
     * @return {Promise}       Returns the promise from the post request.
     */
    endApp: function(signal, app) {
      
      // Open a modal confirming the command
      return $modal.open({
        controller: function($scope, params) {
          $scope.params = params;
        },
        templateUrl: 'components/services/app-manager-service/confirm-end-app-modal.html',
        resolve: {
          params: function() {
            return {
              title: DtText.get('End this application?'),
              body: DtText.get('Are you sure you want to ' + signal + ' this application?')
            };
          }
        }
      }).result
      // Listen for the confirm/cancel promise
      .then(function() {
        var url = getUri.action(signal + 'App', { appId: app.id });
        return $http.post(url);
      });
    }
    
  };
});