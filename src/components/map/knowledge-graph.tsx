
"use client";

import React, { useEffect, useRef } from 'react';
import cytoscape, { type Core } from 'cytoscape';
import type { GenerateKnowledgeGraphOutput } from '@/ai/flows/types/knowledge-graph-types';


interface KnowledgeGraphProps {
  data: GenerateKnowledgeGraphOutput;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (containerRef.current && data) {
      if (cyRef.current) {
        cyRef.current.destroy();
      }

      const elements = [
        ...data.nodes.map(node => ({
          data: { id: node.id, label: node.label, type: node.type }
        })),
        ...data.edges.map(edge => ({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.label
          }
        }))
      ];

      const cy = cytoscape({
        container: containerRef.current,
        elements: elements,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#FFFFFF',
              'label': 'data(label)',
              'color': '#000000',
              'font-size': '12px',
              'text-valign': 'center',
              'text-halign': 'center',
              'shape': 'ellipse',
              'border-width': 0,
              'width': 80,
              'height': 50,
              'text-wrap': 'wrap',
              'text-max-width': 70,
               'font-family': 'sans-serif',
            }
          },
          {
            selector: 'node[type="topic"]',
            style: {
                'background-color': '#ffcdd2',
                'width': 120,
                'height': 70,
                'font-size': '16px',
            }
          },
          {
            selector: 'node[type="entity"]',
            style: {
                 'background-color': '#c8e6c9',
                 'width': 100,
                 'height': 60,
                 'font-size': '14px',
            }
          },
           {
            selector: 'node[type="concept"]',
            style: {
                 'background-color': '#bbdefb',
                 'width': 90,
                 'height': 55,
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 1.5,
              'line-color': '#cccccc',
              'target-arrow-shape': 'none',
              'curve-style': 'bezier',
              'label': 'data(label)',
              'font-size': '10px',
              'color': '#666666',
              'text-rotation': 'autorotate',
              'text-margin-y': -10,
            }
          }
        ],
        layout: {
          name: 'dagre',
          padding: 30,
          spacingFactor: 1.2,
          animate: true,
          animationDuration: 500,
        }
      });
      cyRef.current = cy;

       cy.on('mouseover', 'node', (event) => {
        if(document.body) {
            document.body.style.cursor = 'pointer';
        }
      });
      cy.on('mouseout', 'node', (event) => {
        if(document.body) {
            document.body.style.cursor = 'default';
        }
      });

      return () => {
        if (cyRef.current) {
            cyRef.current.destroy();
            cyRef.current = null;
        }
      };
    }
  }, [data]);

  return <div ref={containerRef} className="w-full h-full rounded-lg bg-background" />;
};
