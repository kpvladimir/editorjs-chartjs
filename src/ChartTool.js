import Chart from "chart.js/auto";
import "./chart.css";

let nextChartToolId = 0;

export default class ChartTool {
  static get toolbox() {
    return {
      title: "Chart",
      icon: `<svg width="17" height="15" viewBox="0 0 17 15" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="5" width="3" height="9" rx="1" fill="currentColor"/><rect x="7" y="2" width="3" height="12" rx="1" fill="currentColor"/><rect x="13" y="7" width="3" height="7" rx="1" fill="currentColor"/></svg>`,
    };
  }

  static get isReadOnlySupported() {
    return true;
  }

  constructor({ data, api, readOnly, config }) {
    this.api = api;
    this.readOnly = readOnly;
    this.config = config || {};
    this.saveImage = this.config.saveImage === true;
    // Editor.js passes an empty object for a newly inserted block and saved
    // chart data when restoring a document.
    this.isNewBlock = !data || Object.keys(data).length === 0;
    this.settingsId = `chart-tool-settings-${++nextChartToolId}`;

    this.data = {
      type: data.type || "bar",
      labels: data.labels || ["Label 1", "Label 2", "Label 3", "Label 4"],
      datasets: data.datasets || [
        {
          label: `${this._t("Dataset")} 1`,
          data: [12, 19, 3, 5],
          backgroundColor: "#4A90E2",
        },
      ],
      title: data.title || "",
    };
    if (this.saveImage && data.image) {
      this.data.image = data.image;
    }

    this.wrapper = null;
    this.chart = null;
    this.CSS = {
      baseClass: "chart-tool",
      wrapper: "chart-tool",
      canvasWrapper: "chart-tool__canvas-wrapper",
      settings: "chart-tool__settings",
      field: "chart-tool__field",
      label: "chart-tool__label",
      input: "chart-tool__input",
      textarea: "chart-tool__textarea",
      colors: "chart-tool__colors",
      color: "chart-tool__color",
      colorSelected: "chart-tool__color--selected",
      addButton: "chart-tool__add-button",
      dataRow: "chart-tool__data-row",
      removeButton: "chart-tool__remove-button",
      datasetBox: "chart-tool__dataset-box",
      datasetHeader: "chart-tool__dataset-header",
    };

    this.colors = [
      "#4A90E2",
      "#50C878",
      "#FF6B6B",
      "#FFD93D",
      "#A29BFE",
      "#FD79A8",
      "#FDCB6E",
      "#00B894",
      "#6C5CE7",
      "#E17055",
      "#74B9FF",
      "#55EFC4",
    ];
  }

  // Check if chart type uses segment-based colors
  _isSegmentBasedChart() {
    return ["pie", "doughnut", "polarArea", "radar"].includes(this.data.type);
  }

  _t(text) {
    return this.api?.i18n?.t ? this.api.i18n.t(text) : text;
  }

  render() {
    this.wrapper = document.createElement("div");
    this.wrapper.classList.add(this.CSS.wrapper);

    // Canvas wrapper
    const canvasWrapper = document.createElement("div");
    canvasWrapper.classList.add(this.CSS.canvasWrapper);
    canvasWrapper.style.position = "relative";

    const canvas = document.createElement("canvas");
    canvasWrapper.appendChild(canvas);

    // Add title click overlay (only in edit mode)
    if (!this.readOnly) {
      const titleOverlay = document.createElement("div");
      titleOverlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 60px;
                cursor: text;
                z-index: 10;
            `;
      titleOverlay.title = this._t("Click to edit title");
      titleOverlay.addEventListener("click", (e) => {
        e.preventDefault();
        this._editTitle();
      });
      canvasWrapper.appendChild(titleOverlay);
    }

    let settings;
    if (!this.readOnly) {
      const settingsToggle = document.createElement("button");
      settingsToggle.type = "button";
      settingsToggle.classList.add("chart-tool__settings-toggle");
      settingsToggle.setAttribute("aria-controls", this.settingsId);

      settings = this._createSettings();
      settings.id = this.settingsId;
      settings.hidden = !this.isNewBlock;

      const updateToggle = () => {
        settingsToggle.setAttribute("aria-expanded", String(!settings.hidden));
        settingsToggle.textContent = settings.hidden
          ? this._t("Edit chart")
          : this._t("Hide settings");
        settingsToggle.title = settings.hidden
          ? this._t("Show chart settings")
          : this._t("Hide chart settings");
      };

      settingsToggle.addEventListener("click", () => {
        settings.hidden = !settings.hidden;
        updateToggle();
      });
      updateToggle();
      canvasWrapper.appendChild(settingsToggle);
    }

    this.wrapper.appendChild(canvasWrapper);

    // Initialize chart
    this._createChart(canvas);

    // Settings panel (only in edit mode). New charts open ready to edit;
    // restored charts start compact and can be expanded with the button.
    if (settings) {
      this.wrapper.appendChild(settings);
    }

    return this.wrapper;
  }

  _createChart(canvas) {
    const isSegmentBased = this._isSegmentBasedChart();

    const chartData = {
      labels: this.data.labels,
      datasets: this.data.datasets.map((dataset) => {
        const useMultiColor = isSegmentBased || dataset.useMultiColor;

        const baseDataset = {
          ...dataset,
          borderWidth: isSegmentBased ? 2 : 2,
          tension: 0.4,
        };

        // For segment-based charts or multi-color mode, use array of colors
        if (useMultiColor) {
          if (Array.isArray(dataset.backgroundColor)) {
            baseDataset.backgroundColor = dataset.backgroundColor;
          } else {
            // Generate colors for each data point
            baseDataset.backgroundColor = dataset.data.map(
              (_, idx) => this.colors[idx % this.colors.length],
            );
          }
          baseDataset.borderColor = isSegmentBased
            ? "#fff"
            : baseDataset.backgroundColor;
        } else {
          // Single color mode
          baseDataset.backgroundColor = Array.isArray(dataset.backgroundColor)
            ? dataset.backgroundColor[0] || this.colors[0]
            : dataset.backgroundColor;
          baseDataset.borderColor = baseDataset.backgroundColor;
        }

        return baseDataset;
      }),
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      ...(this.saveImage
        ? {
            animation: {
              onComplete: ({ chart }) => this._captureChartImage(chart),
            },
          }
        : {}),
      plugins: {
        legend: {
          display: isSegmentBased || this.data.datasets.length > 1,
          position: "top",
        },
        title: {
          display: !!this.data.title,
          text: this.data.title,
          font: {
            size: 16,
            weight: "bold",
          },
        },
      },
    };

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(canvas, {
      type: this.data.type,
      data: chartData,
      options: options,
    });
  }

  _createSettings() {
    const settings = document.createElement("div");
    settings.classList.add(this.CSS.settings);

    // Labels field
    const labelsField = this._createField(
      this._t("Labels (comma-separated)"),
      "input",
      this.data.labels.join(", "),
      (value) => {
        const newLabels = value
          .split(",")
          .map((l) => l.trim())
          .filter((l) => l);

        // Update datasets data array to match new labels length
        this.data.datasets.forEach((dataset) => {
          const currentLength = dataset.data.length;
          const newLength = newLabels.length;

          if (newLength > currentLength) {
            // Add zeros for new labels
            dataset.data = [
              ...dataset.data,
              ...new Array(newLength - currentLength).fill(0),
            ];

            // Add colors for new labels if using array of colors
            if (Array.isArray(dataset.backgroundColor)) {
              const newColors = [];
              for (let i = currentLength; i < newLength; i++) {
                newColors.push(this.colors[i % this.colors.length]);
              }
              dataset.backgroundColor = [
                ...dataset.backgroundColor,
                ...newColors,
              ];
            }
          } else if (newLength < currentLength) {
            // Remove extra data points
            dataset.data = dataset.data.slice(0, newLength);

            // Remove extra colors if using array of colors
            if (Array.isArray(dataset.backgroundColor)) {
              dataset.backgroundColor = dataset.backgroundColor.slice(
                0,
                newLength,
              );
            }
          }
        });

        this.data.labels = newLabels;
        this._refreshDatasets();
        this._updateChart();
      },
    );
    settings.appendChild(labelsField);

    // Datasets container
    this.datasetsContainer = document.createElement("div");

    // Dataset editor
    this.data.datasets.forEach((dataset, index) => {
      const datasetSection = this._createDatasetEditor(dataset, index);
      this.datasetsContainer.appendChild(datasetSection);
    });

    settings.appendChild(this.datasetsContainer);

    // Add Dataset button (only for non-segment charts)
    if (!this._isSegmentBasedChart()) {
      const addButton = document.createElement("button");
      addButton.classList.add(this.CSS.addButton);
      addButton.textContent = this._t("+ Add Dataset");
      addButton.addEventListener("click", () => {
        this._addDataset();
      });
      settings.appendChild(addButton);
    }

    return settings;
  }

  _addDataset() {
    // Create new dataset with default values
    const newDataset = {
      label: `${this._t("Dataset")} ${this.data.datasets.length + 1}`,
      data: new Array(this.data.labels.length).fill(0),
      backgroundColor:
        this.colors[this.data.datasets.length % this.colors.length],
    };

    this.data.datasets.push(newDataset);

    // Re-render datasets
    this._refreshDatasets();
    this._updateChart();
  }

  _removeDataset(index) {
    if (this.data.datasets.length > 1) {
      this.data.datasets.splice(index, 1);
      this._refreshDatasets();
      this._updateChart();
    }
  }

  _refreshDatasets() {
    // Clear existing datasets
    this.datasetsContainer.innerHTML = "";

    // Re-render all datasets
    this.data.datasets.forEach((dataset, index) => {
      const datasetSection = this._createDatasetEditor(dataset, index);
      this.datasetsContainer.appendChild(datasetSection);
    });

    // Re-render the add button if needed
    this._refreshAddButton();
  }

  _refreshAddButton() {
    // Remove existing add button if any
    const existingButton = this.wrapper.querySelector(`.${this.CSS.addButton}`);
    if (existingButton) {
      existingButton.remove();
    }

    // Add button only for non-segment charts
    if (!this._isSegmentBasedChart()) {
      const settings = this.wrapper.querySelector(`.${this.CSS.settings}`);
      if (settings) {
        const addButton = document.createElement("button");
        addButton.classList.add(this.CSS.addButton);
        addButton.textContent = this._t("+ Add Dataset");
        addButton.addEventListener("click", () => {
          this._addDataset();
        });
        settings.appendChild(addButton);
      }
    }
  }

  _createField(labelText, type, value, onChange) {
    const field = document.createElement("div");
    field.classList.add(this.CSS.field);

    const label = document.createElement("label");
    label.classList.add(this.CSS.label);
    label.textContent = labelText;
    field.appendChild(label);

    let input;
    if (type === "textarea") {
      input = document.createElement("textarea");
      input.classList.add(this.CSS.textarea);
    } else {
      input = document.createElement("input");
      input.type = type;
      input.classList.add(this.CSS.input);
    }

    input.value = value;
    input.addEventListener("input", (e) => onChange(e.target.value));
    field.appendChild(input);

    return field;
  }

  _createDatasetEditor(dataset, index) {
    const isSegmentBased = this._isSegmentBasedChart();

    // Outer box container
    const box = document.createElement("div");
    box.classList.add(this.CSS.datasetBox);

    // Header with label and remove button
    const header = document.createElement("div");
    header.classList.add(this.CSS.datasetHeader);

    const label = document.createElement("div");
    label.classList.add(this.CSS.label);
    label.textContent = isSegmentBased
      ? this._t("Data")
      : `${this._t("Dataset")} ${index + 1}`;
    header.appendChild(label);

    // Remove button (only show if more than 1 dataset and not segment-based)
    if (!isSegmentBased && this.data.datasets.length > 1) {
      const removeBtn = document.createElement("button");
      removeBtn.classList.add(this.CSS.removeButton);
      removeBtn.innerHTML = "×";
      removeBtn.title = this._t("Remove dataset");
      removeBtn.addEventListener("click", () => {
        this._removeDataset(index);
      });
      header.appendChild(removeBtn);
    }

    box.appendChild(header);

    // Dataset name (only for non-segment charts)
    if (!isSegmentBased) {
      const nameLabel = document.createElement("label");
      nameLabel.classList.add(this.CSS.label);
      nameLabel.textContent = this._t("Name");
      nameLabel.style.marginBottom = "4px";
      nameLabel.style.display = "block";
      box.appendChild(nameLabel);

      const nameInput = document.createElement("input");
      nameInput.classList.add(this.CSS.input);
      nameInput.value = dataset.label || "";
      nameInput.placeholder = this._t("Enter dataset name");
      nameInput.style.marginBottom = "12px";
      nameInput.addEventListener("input", (e) => {
        dataset.label = e.target.value;
        this._updateChart();
      });
      box.appendChild(nameInput);
    }

    // Data values
    if (isSegmentBased) {
      // For segment-based charts, show label-value-color rows
      this._createSegmentDataEditor(box, dataset);
    } else {
      // For regular charts, show comma-separated values
      const dataLabel = document.createElement("label");
      dataLabel.classList.add(this.CSS.label);
      dataLabel.textContent = this._t("Values");
      dataLabel.style.marginBottom = "4px";
      dataLabel.style.display = "block";
      box.appendChild(dataLabel);

      const dataInput = document.createElement("input");
      dataInput.classList.add(this.CSS.input);
      dataInput.value = dataset.data.join(", ");
      dataInput.placeholder = this._t("Enter values separated by commas");
      dataInput.style.marginBottom = "16px";
      dataInput.addEventListener("input", (e) => {
        dataset.data = e.target.value
          .split(",")
          .map((v) => parseFloat(v.trim()))
          .filter((v) => !isNaN(v));
        this._updateChart();
      });
      box.appendChild(dataInput);

      // Color header with toggle switch
      const colorHeaderWrapper = document.createElement("div");
      colorHeaderWrapper.style.cssText = `
				display: flex;
				align-items: center;
				justify-content: space-between;
				margin-bottom: 8px;
			`;

      const colorLabel = document.createElement("div");
      colorLabel.classList.add(this.CSS.label);
      colorLabel.textContent = this._t("Color");

      const toggleWrapper = document.createElement("div");
      toggleWrapper.style.cssText = `
				display: flex;
				align-items: center;
				gap: 8px;
			`;

      const toggleSwitch = document.createElement("input");
      toggleSwitch.type = "checkbox";
      toggleSwitch.checked = !!dataset.useMultiColor;

      const toggleLabel = document.createElement("label");
      toggleLabel.style.cssText = `
				font-size: 12px;
				font-weight: 500;
				color: #707684;
				cursor: pointer;
				user-select: none;
			`;
      toggleLabel.textContent = this._t("Per value");

      toggleSwitch.addEventListener("change", (e) => {
        dataset.useMultiColor = e.target.checked;
        if (e.target.checked) {
          // Convert single color to array
          const currentColor = Array.isArray(dataset.backgroundColor)
            ? dataset.backgroundColor[0]
            : dataset.backgroundColor;
          dataset.backgroundColor = dataset.data.map(
            (_, idx) => this.colors[idx % this.colors.length],
          );
        } else {
          // Convert array to single color
          const firstColor = Array.isArray(dataset.backgroundColor)
            ? dataset.backgroundColor[0]
            : dataset.backgroundColor;
          dataset.backgroundColor = firstColor || this.colors[0];
        }
        this._refreshDatasets();
        this._updateChart();
      });

      toggleWrapper.appendChild(toggleSwitch);
      toggleWrapper.appendChild(toggleLabel);

      colorHeaderWrapper.appendChild(colorLabel);
      colorHeaderWrapper.appendChild(toggleWrapper);
      box.appendChild(colorHeaderWrapper);

      // Show different UI based on multi-color mode
      if (dataset.useMultiColor) {
        // Multi-color mode: show segment editor
        this._createSegmentDataEditor(box, dataset);
      } else {
        // Single color mode: show color grid
        const currentColor = Array.isArray(dataset.backgroundColor)
          ? dataset.backgroundColor[0] || this.colors[0]
          : dataset.backgroundColor;

        const colorGrid = document.createElement("div");
        colorGrid.classList.add(this.CSS.colors);

        this.colors.forEach((color) => {
          const colorBtn = document.createElement("button");
          colorBtn.classList.add(this.CSS.color);
          colorBtn.style.backgroundColor = color;

          if (currentColor === color) {
            colorBtn.classList.add(this.CSS.colorSelected);
          }

          colorBtn.addEventListener("click", () => {
            dataset.backgroundColor = color;
            this._updateChart();

            // Update selected state
            colorGrid.querySelectorAll(`.${this.CSS.color}`).forEach((btn) => {
              btn.classList.remove(this.CSS.colorSelected);
            });
            colorBtn.classList.add(this.CSS.colorSelected);
          });

          colorGrid.appendChild(colorBtn);
        });

        box.appendChild(colorGrid);
      }
    }

    return box;
  }

  _createSegmentDataEditor(container, dataset) {
    const isSegmentBased = this._isSegmentBasedChart();

    // Ensure backgroundColor is an array
    if (!Array.isArray(dataset.backgroundColor)) {
      dataset.backgroundColor = dataset.data.map(
        (_, idx) => this.colors[idx % this.colors.length],
      );
    }

    const dataLabel = document.createElement("label");
    dataLabel.classList.add(this.CSS.label);
    dataLabel.textContent = isSegmentBased
      ? this._t("Segments")
      : this._t("Values & Colors");
    dataLabel.style.marginBottom = "8px";
    dataLabel.style.display = "block";
    container.appendChild(dataLabel);

    // Create row for each data point
    this.data.labels.forEach((label, idx) => {
      const row = document.createElement("div");
      row.classList.add(this.CSS.dataRow);
      row.style.marginBottom = "8px";

      // Label (read-only for segment-based, editable for others)
      if (isSegmentBased) {
        const labelInput = document.createElement("input");
        labelInput.classList.add(this.CSS.input);
        labelInput.value = label;
        labelInput.disabled = true;
        labelInput.style.backgroundColor = "#f5f5f5";
        row.appendChild(labelInput);
      } else {
        // For non-segment charts just show the label as text
        const labelDiv = document.createElement("div");
        labelDiv.style.cssText = `
					padding: 10px 12px;
					background: #f5f5f5;
					border: 1px solid #e4e6eb;
					border-radius: 6px;
					font-size: 14px;
					display: flex;
					align-items: center;
				`;
        labelDiv.textContent = label;
        row.appendChild(labelDiv);
      }

      // Value input
      const valueInput = document.createElement("input");
      valueInput.classList.add(this.CSS.input);
      valueInput.type = "number";
      valueInput.value = dataset.data[idx] || 0;
      valueInput.placeholder = this._t("Value");
      valueInput.addEventListener("input", (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
          dataset.data[idx] = value;
          this._updateChart();
        }
      });
      row.appendChild(valueInput);

      // Color picker button
      const colorBtn = document.createElement("button");
      colorBtn.classList.add(this.CSS.color);
      colorBtn.style.backgroundColor =
        dataset.backgroundColor[idx] || this.colors[idx % this.colors.length];
      colorBtn.style.width = "36px";
      colorBtn.style.height = "36px";
      colorBtn.style.flexShrink = "0";
      colorBtn.title = this._t("Click to change color");

      colorBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this._showColorPicker(colorBtn, (color) => {
          dataset.backgroundColor[idx] = color;
          colorBtn.style.backgroundColor = color;
          this._updateChart();
        });
      });

      row.appendChild(colorBtn);
      container.appendChild(row);
    });
  }

  _showColorPicker(targetButton, onSelect) {
    // Create popup color picker
    const popup = document.createElement("div");
    popup.style.cssText = `
			position: fixed;
			background: white;
			border: 1px solid #e4e6eb;
			border-radius: 8px;
			padding: 12px;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
			z-index: 1000;
		`;

    const colorGrid = document.createElement("div");
    colorGrid.classList.add(this.CSS.colors, "chart-tool__colors--popup");

    this.colors.forEach((color) => {
      const colorBtn = document.createElement("button");
      colorBtn.classList.add(this.CSS.color);
      colorBtn.style.backgroundColor = color;

      colorBtn.addEventListener("click", () => {
        onSelect(color);
        popup.remove();
      });

      colorGrid.appendChild(colorBtn);
    });

    popup.appendChild(colorGrid);

    // Position near the target button
    const rect = targetButton.getBoundingClientRect();
    popup.style.top = `${rect.bottom + 8}px`;
    popup.style.left = `${rect.left}px`;

    document.body.appendChild(popup);

    // Close on click outside
    const closeHandler = (e) => {
      if (!popup.contains(e.target) && e.target !== targetButton) {
        popup.remove();
        document.removeEventListener("click", closeHandler);
      }
    };

    setTimeout(() => {
      document.addEventListener("click", closeHandler);
    }, 0);
  }
  _updateChart() {
    const canvas = this.wrapper.querySelector("canvas");
    this._createChart(canvas);
  }

  _captureChartImage(chart = this.chart) {
    if (!this.saveImage || !chart || chart !== this.chart) {
      return;
    }

    this.data.image = chart.toBase64Image();
  }

  _editTitle() {
    // Create temporary input overlay
    const canvas = this.wrapper.querySelector("canvas");
    const canvasWrapper = canvas.parentElement;

    const input = document.createElement("input");
    input.type = "text";
    input.value = this.data.title || "";
    input.placeholder = this._t("Enter chart title...");
    input.style.cssText = `
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            width: 60%;
            padding: 8px 12px;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            border: 2px solid #3f8ae0;
            border-radius: 4px;
            z-index: 1000;
            background: white;
        `;

    canvasWrapper.style.position = "relative";
    canvasWrapper.appendChild(input);
    input.focus();
    input.select();

    const saveAndRemove = () => {
      this.data.title = input.value.trim();
      input.remove();
      this._updateChart();
    };

    input.addEventListener("blur", saveAndRemove);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveAndRemove();
      } else if (e.key === "Escape") {
        input.remove();
      }
    });
  }

  save() {
    if (this.saveImage && this.chart) {
      // Finish any in-flight animation so the exported image matches the
      // latest data rather than an intermediate animation frame.
      this.chart.stop();
      this.chart.update("none");
      this._captureChartImage();
    }

    return this.data;
  }

  static get tunes() {
    return [
      {
        name: "bar",
        icon: `<svg width="17" height="15"><rect x="1" y="5" width="3" height="9" fill="currentColor"/><rect x="7" y="2" width="3" height="12" fill="currentColor"/><rect x="13" y="7" width="3" height="7" fill="currentColor"/></svg>`,
      title: "Bar Chart",
      },
      {
        name: "line",
        icon: `<svg width="17" height="15"><path d="M1 14L5 8L9 11L16 1" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
        title: "Line Chart",
      },
      {
        name: "pie",
        icon: `<svg width="17" height="15"><circle cx="8.5" cy="7.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 1V7.5L14 4.5" fill="currentColor"/></svg>`,
        title: "Pie Chart",
      },
      {
        name: "doughnut",
        icon: `<svg width="17" height="15"><circle cx="8.5" cy="7.5" r="6.5" fill="none" stroke="currentColor" stroke-width="3"/></svg>`,
        title: "Doughnut Chart",
      },
      {
        name: "radar",
        icon: `<svg width="17" height="15"><polygon points="8.5,1 15,5 13,12 4,12 2,5" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
        title: "Radar Chart",
      },
      {
        name: "polarArea",
        icon: `<svg width="17" height="15"><path d="M8.5 1L12 7.5L8.5 14L5 7.5Z" fill="currentColor" opacity="0.5"/></svg>`,
        title: "Polar Area Chart",
      },
    ];
  }

  renderSettings() {
    const items = ChartTool.tunes.map((tune) => ({
      icon: tune.icon,
      label: this._t(tune.title),
      isActive: this.data.type === tune.name,
      closeOnActivate: true,
      onActivate: () => {
        const isSegmentBased = [
          "pie",
          "doughnut",
          "polarArea",
          "radar",
        ].includes(tune.name);
        const hasMultipleDatasets = this.data.datasets.length > 1;

        // If switching to segment-based chart with multiple datasets, show confirmation
        if (isSegmentBased && hasMultipleDatasets) {
          const confirmed = confirm(
            `${this._t("This chart type only supports a single dataset.")}\n` +
              `${this._t("Switching will keep only the first dataset and discard the others.")}\n` +
              this._t("Do you want to continue?"),
          );

          if (!confirmed) {
            return; // Cancel the chart type change
          }

          // Keep only the first dataset
          this.data.datasets = [this.data.datasets[0]];
        }

        this.data.type = tune.name;
        this._refreshDatasets();
        this._updateChart();
      },
    }));

    return items;
  }
}
