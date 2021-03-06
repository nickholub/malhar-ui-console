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

angular.module('app.pages.dev.etl',[])
  
  .controller('EtlEditSourceCtrl', function($scope, $modalInstance, source, sources, sourceTypes) {

    $scope.source = source;
    $scope.sources = sources;
    $scope.sourceTypes = sourceTypes;

    $scope.isNew = function() {
      return sources.indexOf(source) === -1;
    };

    $scope.ok = function () {
      $modalInstance.close($scope.source);
    };

    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };

  })

  .controller('BuildEtlCtrl', function ($scope, $modal) {
    
    // Data Sources
    $scope.sourceTypes = [
      {
        id: 'HttpJsonChunksInputOperator',
        description: 'Connect to an HTTP endpoint. Incoming data is interpreted as JSON objects.',
        label: 'HTTP (JSON Chunks)',
        properties: {
          'title': 'properties',
          'type': 'object',
          'description': 'HttpJsonChunksInputOperator properties',
          'properties': {
            'url': {
              'description': 'The URL of the web service resource for the POST request.',
              'type': 'string'
            }
          },
          'required': ['url']
        }
      },
      {
        id: 'HttpLinesInputOperator',
        description: 'Connect to an HTTP endpoint. Each line of input is a new tuple.',
        label: 'HTTP (Lines)',
        properties: {
          'title': 'properties',
          'type': 'object',
          'description': 'HttpLinesInputOperator properties',
          'properties': {
            'url': {
              'description': 'The URL of the web service resource for the POST request.',
              'type': 'string'
            }
          },
          'required': ['url']
        }
      }
    ];
    $scope.sources = [];

    $scope.addDataSource = function() {
      var newSource = {};
      $scope.editDataSource(newSource);
    };

    $scope.editDataSource = function(source) {

      var modalInstance = $modal.open({
        templateUrl: 'views/dev/etl/edit-source.html',
        controller: 'EtlEditSourceCtrl',
        resolve: {
          source: function () {
            return source;
          },
          sources: function() {
            return $scope.sources;
          },
          sourceTypes: function() {
            return $scope.sourceTypes;
          }
        }
      });

      modalInstance.result.then(
        // success
        function(source) {
          // insert if not present in sources
          if ($scope.sources.indexOf(source) === -1) {
            $scope.sources.push(source);
          }
          console.log('close');
        },
        // failure
        function() {
          console.log('dismiss');
        }
      );

    };

  });
