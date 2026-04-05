import React from 'react';

import { Graph } from '@antv/x6';

import Save from './save';
import Selection from './selection';
import Undo from './undo';
import Redo from './redo';
import Zoom from './zoom';
import FitWindow from './fitWindow';
import View from './view';
import Fullscreen from './fullscreen';
import Mock from './mock';
import ShowParams from './showParams';
import ShowSteps from './showSteps';
import ShowDependencies from './showDependencies';
import ShowAll from './showAll';
import InterfaceSelector from './interfaceSelector';
import ViewModeSwitch from './viewModeSwitch';
import HoverPanelToggle from './hoverPanel';
import ExecutionTraceWidget from './executionTrace';

interface IProps {
  flowGraph: Graph;
}

const tools: React.FC<IProps>[][] = [
  [InterfaceSelector, ViewModeSwitch, HoverPanelToggle, ExecutionTraceWidget],
  [Zoom],
  [FitWindow, Undo, Redo, Selection, Save, View, Fullscreen, ShowParams, ShowSteps, ShowDependencies, ShowAll],
];

export default tools;
