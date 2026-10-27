# Editor.js Chart Tool

A Chart.js integration plugin for Editor.js that allows you to create charts right in the editor.

<p align="center">
  <img src="assets/bar1.png" width="45%" />
  <img src="assets/pie1.png" width="45%" />
</p>

## Features

-   **6 Chart Types**: Bar, Line, Pie, Doughnut, Radar, and Polar Area charts
-   **Full Editability**: Edit labels, data values, titles, and colors in real-time
-   **Color Picker**: Choose from 12 preset colors for your charts
-   **Multiple Datasets**: Support for multiple data sets (in non-segmented charts)
-   **Collapsible Settings**: Hide the chart editor to keep documents compact; newly inserted charts open with settings visible, while saved charts open with settings hidden
-   **Localization**: All plugin interface text uses the Editor.js I18n API
-   **Optional PNG Snapshot**: Include the rendered chart image in the block data when saving

## Installation

```bash
npm install editorjs-chartjs chart.js
```

## Usage

### Basic Setup

```javascript
import EditorJS from '@editorjs/editorjs';
import ChartTool from 'editorjs-chartjs';

const editor = new EditorJS({
	holder: 'editorjs',
	tools: {
		chart: {
			class: ChartTool,
		},
	},
});
```

### With Initial Data

```javascript
const editor = new EditorJS({
	holder: 'editorjs',
	tools: {
		chart: ChartTool,
	},
	data: {
		blocks: [
			{
				type: 'chart',
				data: {
					type: 'bar',
					title: 'Monthly Revenue',
					labels: ['Jan', 'Feb', 'Mar', 'Apr'],
					datasets: [
						{
							label: 'Sales',
							data: [12000, 19000, 15000, 25000],
							backgroundColor: '#4A90E2',
						},
					],
				},
			},
		],
	},
});
```

### Localization

The plugin uses the Editor.js I18n API for its interface text. Add translations under `i18n.messages.tools.chart`; translate the toolbox name separately under `i18n.messages.toolNames`.

```javascript
const editor = new EditorJS({
	holder: 'editorjs',
	tools: {
		chart: {
			class: ChartTool,
		},
	},
	i18n: {
		messages: {
			toolNames: {
				Chart: 'Диаграмма',
			},
			tools: {
				chart: {
					'Click to edit title': 'Нажмите, чтобы изменить заголовок',
					'Edit chart': 'Изменить диаграмму',
					'Hide settings': 'Скрыть настройки',
					'Show chart settings': 'Показать настройки диаграммы',
					'Labels (comma-separated)': 'Подписи (через запятую)',
					'+ Add Dataset': '+ Добавить набор данных',
					'Dataset': 'Набор данных',
					'Data': 'Данные',
					'Remove dataset': 'Удалить набор данных',
					'Name': 'Название',
					'Enter dataset name': 'Введите название набора данных',
					'Values': 'Значения',
					'Enter values separated by commas': 'Введите значения через запятую',
					'Color': 'Цвет',
					'Per value': 'Для каждого значения',
					'Segments': 'Сегменты',
					'Values & Colors': 'Значения и цвета',
					'Value': 'Значение',
					'Click to change color': 'Нажмите, чтобы изменить цвет',
					'Enter chart title...': 'Введите заголовок диаграммы...',
					'Bar Chart': 'Столбчатая диаграмма',
					'Line Chart': 'Линейная диаграмма',
					'Pie Chart': 'Круговая диаграмма',
					'Doughnut Chart': 'Кольцевая диаграмма',
					'Radar Chart': 'Лепестковая диаграмма',
					'Polar Area Chart': 'Полярная диаграмма',
					'This chart type only supports a single dataset.': 'Этот тип диаграммы поддерживает только один набор данных.',
					'Switching will keep only the first dataset and discard the others.': 'После переключения останется только первый набор данных, остальные будут удалены.',
					'Do you want to continue?': 'Продолжить?',
				},
			},
		},
	},
});
```

Editor.js translates only the strings provided in the dictionary. Untranslated plugin strings remain in English. The demo's `index.html` contains a complete Russian dictionary.

### Save Chart Images

By default, the plugin saves only the chart configuration and data. To also save a PNG snapshot in the Editor.js block data, enable `saveImage` in the tool config:

```javascript
const editor = new EditorJS({
	holder: 'editorjs',
	tools: {
		chart: {
			class: ChartTool,
			config: {
				saveImage: true,
			},
		},
	},
});
```

When enabled, each chart block's saved `data` includes an `image` property containing a PNG Data URL (`data:image/png;base64,...`). The snapshot is refreshed when the chart finishes rendering and immediately before `editor.save()` returns, so the saved image reflects the latest data. PNG Data URLs increase the document JSON size; disable `saveImage` when you only need chart data.

## Development

### Setup

```bash
npm install
```

### Start Dev Server

```bash
npm run dev
```

This will start a Vite dev server at `http://localhost:5173` with a live demo of the chart tool.

### Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Data Structure

The plugin saves data in the following format:

```javascript
{
  type: 'bar',           // Chart type
  title: 'Chart Title',  // Optional chart title
  labels: ['A', 'B'],    // X-axis labels
  datasets: [
    {
      label: 'Dataset 1',        // Dataset name
      data: [10, 20],            // Values
      backgroundColor: '#4A90E2' // Color
    }
  ]
}
```

## Customization

### Available Colors

The plugin comes with 12 preset colors:

-   Blue (#4A90E2)
-   Green (#50C878)
-   Red (#FF6B6B)
-   Yellow (#FFD93D)
-   Purple (#A29BFE)
-   Pink (#FD79A8)
-   Orange (#FDCB6E)
-   Teal (#00B894)
-   Indigo (#6C5CE7)
-   Coral (#E17055)
-   Sky Blue (#74B9FF)
-   Mint (#55EFC4)

### Styling

You can customize the appearance by overriding the CSS classes:

```css
.chart-tool {
	/* Main wrapper */
}

.chart-tool__canvas-wrapper {
	/* Chart canvas container */
}

.chart-tool__settings {
	/* Settings panel */
}
```

## Credits

Built with:

-   [Editor.js](https://editorjs.io/)
-   [Chart.js](https://www.chartjs.org/)
-   [Vite](https://vitejs.dev/)

---
