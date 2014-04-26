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
var BaseView = DT.widgets.Widget;
var d3 = require('d3');
var dagreD3 = require('dagre-d3');
var settings = DT.settings;

/**
 * Base class for DAG widgets
 */
var DagWidget = BaseView.extend({

	showLocality: false,

    onlyScrollOnAlt: true,

    template: forceImplement('template'),
    
    html: forceImplement('html'),

    /**
     * Renders legend, renders graph to .svg-main element
     * 
     * @param  {Object} data       JSON-serialized POJO of logical plan
     * @return {void}
     */
    displayGraph: function(data) {
        // Does not necessarily do anything, only if implemented
        this.renderLegend();

        // Implemented in child class
        var graph = this.buildGraph(data);

        // Renders the main graph
        this.renderGraph(graph, this.$('.app-dag > .svg-main')[0]);
    },

    
    buildGraph: forceImplement('buildGraph'),

    /**
     * Renders the main graph itself
     * @param  {Object} graph       Object generated by buildGraph
     * @param  {Element} selector   The element that the graph should be added to
     * @return {void}
     */
    renderGraph: function(graph, selector) {
        var svgParent = jQuery(selector);
        var nodes = graph.nodes;
        var links = graph.links;

        var graphElem = svgParent.children('g').get(0);
        var svg = d3.select(graphElem);

        // Remove all inner elements
        svg.selectAll("*").remove();

        // Create renderer
        var renderer = new dagreD3.Renderer();

        // Extend original post render function
        var oldPostRender = renderer._postRender;
        renderer._postRender = function (graph, root) {
            oldPostRender.call(renderer, graph, root);
            this.postRender(graph, root);
        }.bind(this);

        // Define the function that calculates the dimensions for
        // an edge in the graph (adds 10 pixels to either side)
        renderer._calculateEdgeDimensions = function (group, value) {
            var bbox = group.getBBox();
            value.width = bbox.width + 10;
            value.height = bbox.height;
        };

        // Create the layout object
        var layout = dagreD3.layout()
            // DAG should go from left to right (LR)
            .rankDir('LR');

        // Run the renderer
        var d3_graph = renderer.layout(layout).run(dagreD3.json.decode(nodes, links), svg.append("g"));

        // Adjusting height to content
        var main = svgParent.find('g > g');
        var main_dimensions = main.get(0).getBoundingClientRect();
        var h = main_dimensions.height;
        var newHeight = h + 50;
        newHeight = newHeight < 200 ? 200 : newHeight;
        newHeight = newHeight > 500 ? 500 : newHeight;
        svgParent.height(newHeight);

        var self = this;

        // Zoom
        var zoomBehavior = this.zoomBehavior = d3.behavior
            .zoom()
            .scaleExtent([0.1,4]);

        var lastZoomLevel = this.lastZoomLevel = {
            translate: zoomBehavior.translate(),
            scale: zoomBehavior.scale()
        };

        zoomBehavior.on("zoom", function() {
                var ev = d3.event;

                if (self.onlyScrollOnAlt && !ev.sourceEvent.altKey && ev.sourceEvent.type === "wheel") {
                    var sev = ev.sourceEvent;
                    window.scrollBy(0, sev.deltaY);
                    zoomBehavior.translate(lastZoomLevel.translate);
                    zoomBehavior.scale(lastZoomLevel.scale);
                } else {
                    lastZoomLevel.translate = ev.translate;
                    lastZoomLevel.scale = ev.scale;
                    svg.select("g")
                        .attr("transform", "translate(" + ev.translate + ") scale(" + ev.scale + ")");
                    self.updateMinimap(svgParent, ev.translate, ev.scale);
                }
                
            });
        
        // Render the minimap/flyover/birds eye view
        this.renderMinimap(d3_graph, main_dimensions, svgParent);

        zoomBehavior(d3.select(svgParent.get(0)));
    },

    renderLegend: function() {
    	// empty implementation (not required)
    },

    postRender: function() {
        // empty implementation
    },

    /**
     * Creates minimap of the dag view.
     * @param  {d3.Digraph}   graph
     * @param  {Object}       graph_dimensions    Contains width and height attributes of dag boundaries
     * @param  {jQuery}       root                Root svg element as a jquery element
     * @return {void}
     */
    renderMinimap: function(graph, graph_dimensions, $root) {

        // Reference to the group that gets transform attribute updated.
        var graphGroup = $root.find('g>g')[0];

        // Padding for the map
        var mapPadding = 10;
        var halfMapPadding = mapPadding/2;

        // Width and Height of root svg element in widget
        var rootWidth = $root.width();
        var rootHeight = $root.height();

        // The map's width
        var minimapWidth = rootWidth * 0.2;
        // The ratio between the map and the graph
        var mapMultiplier = this.minimapMultiplier = minimapWidth / graph_dimensions.width;
        // Map height
        var minimapHeight = graph_dimensions.height * mapMultiplier + mapPadding;
        // adjust minimapWidth with padding
        minimapWidth += mapPadding;

        // Create the minimap group
        var minimap = this.minimap = d3.select($root[0])
            .append('g')
            .attr({
                'class': 'dag-minimap',
                // minus 1 to include bottom and right borders for minimap
                'transform': 'translate(' + (rootWidth - minimapWidth - 1) + ',' + (rootHeight - minimapHeight -1) + ')'
            });

        // backdrop
        minimap.append('rect').attr({
            'class': 'minimap-backdrop',
            'height': minimapHeight,
            'width': minimapWidth
        });

        // Create clip-path for viewbox
        minimap.append('defs').append('clipPath')
            .attr('id', 'minimap-clip-path')
            .append('rect')
            .attr({
                'height': minimapHeight,
                'width': minimapWidth
            });

        // edges
        graph.eachEdge(function(stream_id, source_name, sink_name, info) {
            minimap.append('path')
                .attr('class', 'minimap-stream')
                .attr('d', function() {
                    
                    var points;
                    // var points = info.points; // uncomment if cpettit ever fixes this

                    // HACK: points no longer contain endpoints on nodes
                    var src = graph.node(source_name);
                    var dest = graph.node(sink_name);
                    points = [{x: src.x, y: src.y}].concat(info.points);
                    points = points.concat({x: dest.x, y: dest.y});

                    var point_strings = _.map(points, function(point) { 
                        return (point.x * mapMultiplier + halfMapPadding) + 
                        ',' + 
                        (point.y * mapMultiplier + halfMapPadding)
                    });
                    return 'M' + point_strings.join('L');
                });
        });

        // nodes
        graph.eachNode(function(nodeName, info) {
            var width, height;
            minimap.append('rect')
                .attr({
                    'class': 'minimap-operator',
                    'width': width = info.width * mapMultiplier,
                    'height': height = info.height * mapMultiplier,
                    'x': info.x * mapMultiplier - width/2 + halfMapPadding,
                    'y': info.y * mapMultiplier - height/2 + halfMapPadding
                });
        });

        // Create minimap viewbox
        var viewbox = minimap.append('rect')
            .attr('class', 'minimap-viewbox')
            .attr({
                'width': rootWidth * mapMultiplier,
                'height': rootHeight * mapMultiplier,
                'x': 0,
                'y': 0,
                'clip-path': 'url(#minimap-clip-path)'
            });

        // Create the interaction element
        var interaction = minimap.append('rect')
            .attr({
                'class': 'minimap-interaction',
                'height': minimapHeight,
                'width': minimapWidth
            });

        var updateGraphPosition = _.bind(function() {
            // d3.event.preventDefault();
            // d3.event.stopPropagation(); // silence other listeners
            var scale = this.zoomBehavior.scale();
            var x = ((d3.event.x - viewbox.attr('width') / 2) / mapMultiplier) * scale;
            var y = ((d3.event.y - viewbox.attr('height') / 2) / mapMultiplier) * scale;
            graphGroup.setAttribute('transform', 'translate(' + -x + ',' + -y + ') scale(' + scale + ')');
            // console.log('scale: ', this.zoomBehavior.scale());
            this.zoomBehavior.translate([-x,-y]);
            this.updateMinimap($root,[-x,-y], scale);
        }, this);

        var drag = d3.behavior.drag()
            // .on('drag', updateGraphPosition)
            // .on("dragstart", updateGraphPosition);
            .on('drag', function() {
                updateGraphPosition();
            })
            .on('dragstart', function() {
                // console.log('drag starting');
                // updateGraphPosition();
            });

        interaction
        .on('mousedown', function() {
            d3.event.preventDefault();
            d3.event.stopPropagation();
        })
        .call(drag);

    },

    /**
     * Updates the minimap, given the jQuery-wrapped svg element, the new translation and scale
     * @param  {jQuery} $svg      jQuery-wrapped svg element
     * @param  {Array} translate  array of x and y value
     * @param  {Number} scale     scale of the zoom
     * @return {void}
     */
    updateMinimap: function($svg, translate, scale) {
        var viewbox = this.minimap.select('.minimap-viewbox');
        var viewboxWidth = $svg.width() * this.minimapMultiplier / scale;
        var viewboxHeight = $svg.height() * this.minimapMultiplier / scale;
        var offset = $svg.position().top;
        var x = translate[0];
        var y = translate[1];
        
        viewbox.attr({
            'width': viewboxWidth,
            'height': viewboxHeight,
            'x': -x * this.minimapMultiplier / scale,
            'y': (-y - offset) * this.minimapMultiplier / scale
        });
    },

    resetPosition: function(e) {
        e.preventDefault();
        this.zoomBehavior.scale(1).translate([0,0]);
        this.lastZoomLevel.scale = 1;
        this.lastZoomLevel.translate = [0,0];
        this.$('svg.svg-main > g > g').attr("transform", null);
        this.updateMinimap($('svg.svg-main'), [0,0],1);
    },

    addMetricLabel: function (nodeSvg, height) {
        var labelSvg = nodeSvg.append("g").attr('class', 'node-metric-label');
        labelSvg
            .append("text")
            .attr("text-anchor", "left")
            .append("tspan")
            .attr("dy", "1em");

        var bbox = labelSvg.node().getBBox();

        labelSvg.attr("transform",
            "translate(" + (-bbox.width / 2) + "," + (-bbox.height - height / 2 - 4) + ")");
    },

    addMetricLabelDown: function (nodeSvg, height) {
        var labelSvg = nodeSvg.append("g").attr('class', 'node-metric2-label');
        labelSvg
            .append("text")
            .attr("text-anchor", "left")
            .append("tspan")
            .attr("dy", "1em");

        var bbox = labelSvg.node().getBBox();

        labelSvg.attr("transform",
            "translate(" + (-bbox.width / 2) + "," + (-bbox.height + height + 4) + ")");
    },

    events: {
        'click .reset-position': 'resetPosition',
        'change .metric-select': 'changeMetric',
        'click .metric-prev': 'prevMetric',
        'click .metric-next': 'nextMetric',
        'change .metric2-select': 'changeMetric2',
        'click .metric-prev2': 'prevMetric2',
        'click .metric-next2': 'nextMetric2',
        'click .toggle-locality': 'toggleLocality',
        'click .toggle-legend': 'toggleLegend'
    },

    prevMetric: function (event) {
        event.preventDefault();
        var selMetric = this.$('.metric-select').val();
        var index = _.indexOf(this.metricIds, selMetric);
        var nextIndex = (this.metricIds.length + index - 1) % this.metricIds.length;
        this.$('.metric-select').val(this.metricIds[nextIndex]);
        this.changeMetric();
    },

    nextMetric: function (event) {
        event.preventDefault();
        var selMetric = this.$('.metric-select').val();
        var index = _.indexOf(this.metricIds, selMetric);
        var nextIndex = (index + 1) % this.metricIds.length;
        this.$('.metric-select').val(this.metricIds[nextIndex]);
        this.changeMetric();
    },

    prevMetric2: function (event) {
        event.preventDefault();
        var selMetric = this.$('.metric2-select').val();
        var index = _.indexOf(this.metricIds, selMetric);
        var nextIndex = (this.metricIds.length + index - 1) % this.metricIds.length;
        this.$('.metric2-select').val(this.metricIds[nextIndex]);
        this.changeMetric2();
    },

    nextMetric2: function (event) {
        event.preventDefault();
        var selMetric = this.$('.metric2-select').val();
        var index = _.indexOf(this.metricIds, selMetric);
        var nextIndex = (index + 1) % this.metricIds.length;
        this.$('.metric2-select').val(this.metricIds[nextIndex]);
        this.changeMetric2();
    },

    toggleLocality: function (event) {
        event.preventDefault();

        var toggleLocalityLink = this.$el.find('.toggle-locality');
        var legend = this.$el.find('.dag-legend');

        this.showLocality = !this.showLocality;

        if (this.showLocality) {
            toggleLocalityLink.text('Hide Stream Locality');
            this.updateStreams(this.graph, this.svgRoot);
            legend.show();
        } else {
            toggleLocalityLink.text('Show Stream Locality');
            this.clearStreamLocality(this.svgRoot);
            legend.hide();
        }
    },

    toggleLegend: function (event) {
        event.preventDefault();

        var toggleLink = this.$el.find('.toggle-legend');
        var legend = this.$el.find('.logical-dag-legend');

        if (legend.is(':visible')) {
            toggleLink.text('Show Legend');
            legend.hide();
        } else {
            toggleLink.text('Hide Legend');
            legend.show();
        }
    },

    updateMetrics: function () {
        var changed = this.partitionsMetricModel.update(this.collection, true);

        if (changed) {
            this.updatePartitions();
        }

        if (!this.metricModel.isNone()) {
            this.metricModel.update(this.collection);
            this.updateMetricLabels(this.metricModel);
        }

        if (!this.metricModel2.isNone()) {
            this.metricModel2.update(this.collection);
            this.updateMetric2Labels(this.metricModel2);
        }
    },

    updatePartitions: function () {
        var that = this;
        this.svgNodes.each(function (d, i) {
            var nodeSvg = d3.select(this);

            var multiple = that.partitionsMetricModel.showMetric(d);

            var filter = multiple ? 'url(#f1)' : null;
            //var nodeLabel = nodeSvg.select('.label');
            //nodeLabel.attr('filter', filter);

            var nodeRect = nodeSvg.select('.label > rect');
            nodeRect.attr('filter', filter);
        });
    },

    updateMetricLabels: function (metric) {
        var that = this;
        var graph = this.graph;
        this.svgNodes.each(function (d, i) {
            var nodeSvg = d3.select(this);
            that.updateMetricLabel(graph, metric, d, nodeSvg);
        });
    },

    updateMetric2Labels: function (metric) {
        var that = this;
        var graph = this.graph;
        this.svgNodes.each(function (d, i) {
            var nodeSvg = d3.select(this);
            that.updateMetric2Label(graph, metric, d, nodeSvg);
        });
    },

    updateMetricLabel: function (graph, metric, d, nodeSvg) {
        var value = metric.getTextValue(d);
        var showMetric = metric.showMetric(d);

        var metricLabel = nodeSvg.select('.node-metric-label');
        var metricLabelText = metricLabel.select('tspan');

        var text = showMetric ? value : '';
        metricLabelText.text(text);

        var bbox = metricLabel.node().getBBox();
        var height = graph.node(d).height;
        metricLabel.attr("transform",
            "translate(" + (-bbox.width / 2) + "," + (-bbox.height - height / 2 - 4) + ")");
    },

    updateMetric2Label: function (graph, metric, d, nodeSvg) {
        var value = metric.getTextValue(d);
        var showMetric = metric.showMetric(d);

        var metricLabel = nodeSvg.select('.node-metric2-label');
        var metricLabelText = metricLabel.select('tspan');

        var text = showMetric ? value : '';
        metricLabelText.text(text);

        var bbox = metricLabel.node().getBBox();
        var height = graph.node(d).height;

        metricLabel.attr("transform",
            "translate(" + (-bbox.width / 2) + "," + (-bbox.height + height + 4) + ")");
    },

    createStreamLocalityMap: function () {
        var streamLocality = {};
        this.streams.each(function (stream) {
            if (stream.has('locality')) {
                streamLocality[stream.get('name')] = stream.get('locality');
            }
        });

        return streamLocality;
    },

    clearStreamLocality: function (root) {
        root.selectAll("g .edge > path").attr('stroke-dasharray', null);
    },

    updateStreams: function (graph, root) {
        var streamLocality = this.createStreamLocalityMap();

        root.selectAll("g .edgePath > path").each(function (d) {
            var value = graph.edge(d);
            var streamName = value.label;

            var locality = streamLocality.hasOwnProperty(streamName) ? streamLocality[streamName] : 'NONE';
            var localityDisplayProperty = settings.dag.edges.hasOwnProperty(locality) ? settings.dag.edges[locality] : settings.dag.edges.NONE;

            if (localityDisplayProperty.dasharray) {
                d3.select(this).attr('stroke-dasharray', localityDisplayProperty.dasharray);
            }
        });
    }

});

function forceImplement(methodName) {
	return function() {
		throw new Error(methodName + ' must be implemented in a child class of DagWidget!');
	}
}

exports = module.exports = DagWidget;