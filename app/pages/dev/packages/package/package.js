/*
 * Copyright (c) 2014 DataTorrent, Inc. ALL Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('app.pages.dev.packages.package', [
  'app.components.resources.PackageModel',
  'app.components.resources.PackageApplicationModel',
  'app.components.resources.PackageApplicationCollection'
])

// Routing
  .config(function($routeProvider, settings) {

    $routeProvider.when(settings.pages.Package, {
      controller: 'PackageCtrl',
      templateUrl: 'pages/dev/packages/package/package.html',
      label: 'packageName'
    });

  })

// Controller
  .controller('PackageCtrl', function($scope, $routeParams, PackageModel, PackageApplicationModel, PackageApplicationCollection) {
    $scope.packageName = $routeParams.packageName;
    $scope.packageVersion = $routeParams.packageVersion;

    $scope.package = new PackageModel({
      packageName: $routeParams.packageName,
      packageVersion: $routeParams.packageVersion
    });
    $scope.package.fetch();

    $scope.apps = new PackageApplicationCollection({
      packageName: $routeParams.packageName,
      packageVersion: $routeParams.packageVersion
    });
    $scope.apps.fetch();

    $scope.alerts = [];
    var msgIds = 0;

    $scope.launch = function (event, name) {
      var app = new PackageApplicationModel({
        packageName: $routeParams.packageName,
        packageVersion: $routeParams.packageVersion,
        appName: name
      });
      var infoMsgId = msgIds++;
      $scope.alerts.push({
        id: infoMsgId,
        type: 'info',
        include: 'pages/dev/packages/package/msgSubmit.html'
      });

      app.launch().success(function (response) {
        // remove info msg
        $scope.alerts = _.reject($scope.alerts, function (alert) {
          return alert.id === infoMsgId;
        });

        $scope.alerts.push({
          type: 'success',
          appName: name,
          appId: response.appId,
          include: 'pages/dev/packages/package/msgLaunch.html'
        });
      });
    };

    $scope.closeAlert = function (index) {
      $scope.alerts.splice(index, 1);
    };
  });