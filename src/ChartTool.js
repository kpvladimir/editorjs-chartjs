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
    this.savedChartsUrl = this.config.savedChartsUrl;
    this.savedCharts = [];
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
                z-index: 2;
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
      const actions = document.createElement("div");
      actions.classList.add("chart-tool__actions");

      const settingsToggle = document.createElement("button");
      settingsToggle.type = "button";
      settingsToggle.classList.add("chart-tool__settings-toggle");
      settingsToggle.setAttribute("aria-controls", this.settingsId);
      settingsToggle.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="800px" height="800px" viewBox="0 0 28 28" fill="none"><path clip-rule="evenodd" d="M14 20C17.3137 20 20 17.3137 20 14C20 10.6863 17.3137 8 14 8C10.6863 8 8 10.6863 8 14C8 17.3137 10.6863 20 14 20ZM18 14C18 16.2091 16.2091 18 14 18C11.7909 18 10 16.2091 10 14C10 11.7909 11.7909 10 14 10C16.2091 10 18 11.7909 18 14Z" fill="#000000" fill-rule="evenodd"/><path clip-rule="evenodd" d="M0 12.9996V14.9996C0 16.5478 1.17261 17.822 2.67809 17.9826C2.80588 18.3459 2.95062 18.7011 3.11133 19.0473C2.12484 20.226 2.18536 21.984 3.29291 23.0916L4.70712 24.5058C5.78946 25.5881 7.49305 25.6706 8.67003 24.7531C9.1044 24.9688 9.55383 25.159 10.0163 25.3218C10.1769 26.8273 11.4511 28 12.9993 28H14.9993C16.5471 28 17.8211 26.8279 17.9821 25.3228C18.4024 25.175 18.8119 25.0046 19.2091 24.8129C20.3823 25.6664 22.0344 25.564 23.0926 24.5058L24.5068 23.0916C25.565 22.0334 25.6674 20.3813 24.814 19.2081C25.0054 18.8113 25.1757 18.4023 25.3234 17.9824C26.8282 17.8211 28 16.5472 28 14.9996V12.9996C28 11.452 26.8282 10.1782 25.3234 10.0169C25.1605 9.55375 24.9701 9.10374 24.7541 8.66883C25.6708 7.49189 25.5882 5.78888 24.5061 4.70681L23.0919 3.29259C21.9846 2.18531 20.2271 2.12455 19.0485 3.1103C18.7017 2.94935 18.3459 2.80441 17.982 2.67647C17.8207 1.17177 16.5468 0 14.9993 0H12.9993C11.4514 0 10.1773 1.17231 10.0164 2.6775C9.60779 2.8213 9.20936 2.98653 8.82251 3.17181C7.64444 2.12251 5.83764 2.16276 4.70782 3.29259L3.2936 4.7068C2.16377 5.83664 2.12352 7.64345 3.17285 8.82152C2.98737 9.20877 2.82199 9.60763 2.67809 10.0167C1.17261 10.1773 0 11.4515 0 12.9996ZM15.9993 3C15.9993 2.44772 15.5516 2 14.9993 2H12.9993C12.447 2 11.9993 2.44772 11.9993 3V3.38269C11.9993 3.85823 11.6626 4.26276 11.2059 4.39542C10.4966 4.60148 9.81974 4.88401 9.18495 5.23348C8.76836 5.46282 8.24425 5.41481 7.90799 5.07855L7.53624 4.70681C7.14572 4.31628 6.51256 4.31628 6.12203 4.7068L4.70782 6.12102C4.31729 6.51154 4.31729 7.14471 4.70782 7.53523L5.07958 7.90699C5.41584 8.24325 5.46385 8.76736 5.23451 9.18395C4.88485 9.8191 4.6022 10.4963 4.39611 11.2061C4.2635 11.6629 3.85894 11.9996 3.38334 11.9996H3C2.44772 11.9996 2 12.4474 2 12.9996V14.9996C2 15.5519 2.44772 15.9996 3 15.9996H3.38334C3.85894 15.9996 4.26349 16.3364 4.39611 16.7931C4.58954 17.4594 4.85042 18.0969 5.17085 18.6979C5.39202 19.1127 5.34095 19.6293 5.00855 19.9617L4.70712 20.2632C4.3166 20.6537 4.3166 21.2868 4.70712 21.6774L6.12134 23.0916C6.51186 23.4821 7.14503 23.4821 7.53555 23.0916L7.77887 22.8483C8.11899 22.5081 8.65055 22.4633 9.06879 22.7008C9.73695 23.0804 10.4531 23.3852 11.2059 23.6039C11.6626 23.7365 11.9993 24.1411 11.9993 24.6166V25C11.9993 25.5523 12.447 26 12.9993 26H14.9993C15.5516 26 15.9993 25.5523 15.9993 25V24.6174C15.9993 24.1418 16.3361 23.7372 16.7929 23.6046C17.5032 23.3985 18.1809 23.1157 18.8164 22.7658C19.233 22.5365 19.7571 22.5845 20.0934 22.9208L20.2642 23.0916C20.6547 23.4821 21.2879 23.4821 21.6784 23.0916L23.0926 21.6774C23.4831 21.2868 23.4831 20.6537 23.0926 20.2632L22.9218 20.0924C22.5855 19.7561 22.5375 19.232 22.7669 18.8154C23.1166 18.1802 23.3992 17.503 23.6053 16.7931C23.7379 16.3364 24.1425 15.9996 24.6181 15.9996H25C25.5523 15.9996 26 15.5519 26 14.9996V12.9996C26 12.4474 25.5523 11.9996 25 11.9996H24.6181C24.1425 11.9996 23.7379 11.6629 23.6053 11.2061C23.3866 10.4529 23.0817 9.73627 22.7019 9.06773C22.4643 8.64949 22.5092 8.11793 22.8493 7.77781L23.0919 7.53523C23.4824 7.14471 23.4824 6.51154 23.0919 6.12102L21.6777 4.7068C21.2872 4.31628 20.654 4.31628 20.2635 4.7068L19.9628 5.00748C19.6304 5.33988 19.1137 5.39096 18.6989 5.16979C18.0976 4.84915 17.4596 4.58815 16.7929 4.39467C16.3361 4.2621 15.9993 3.85752 15.9993 3.38187V3Z" fill-rule="evenodd"/></svg>';

      settings = this._createSettings();
      this.settingsPanel = settings;
      settings.id = this.settingsId;
      this.settingsExpanded = this.isNewBlock;
      settings.classList.toggle(
        "chart-tool__settings--collapsed",
        !this.settingsExpanded,
      );
      settings.inert = !this.settingsExpanded;
      settings.setAttribute("aria-hidden", String(!this.settingsExpanded));

      const updateToggle = () => {
        settingsToggle.setAttribute(
          "aria-expanded",
          String(this.settingsExpanded),
        );
        settingsToggle.title = this.settingsExpanded
          ? this._t("Hide chart settings")
          : this._t("Show chart settings");
        settingsToggle.setAttribute("aria-label", settingsToggle.title);
      };

      settingsToggle.addEventListener("click", () => {
        this.settingsExpanded = !this.settingsExpanded;
        this.settingsPanel.classList.toggle(
          "chart-tool__settings--collapsed",
          !this.settingsExpanded,
        );
        this.settingsPanel.inert = !this.settingsExpanded;
        this.settingsPanel.setAttribute(
          "aria-hidden",
          String(!this.settingsExpanded),
        );
        updateToggle();
      });
      updateToggle();
      actions.appendChild(settingsToggle);

      if (this.savedChartsUrl) {
        const loadButton = document.createElement("button");
        loadButton.type = "button";
        loadButton.classList.add("chart-tool__action");
        loadButton.title = this._t("Load saved charts");
        loadButton.setAttribute("aria-label", loadButton.title);
        loadButton.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 15v4h14v-4"/></svg>';
        loadButton.addEventListener("click", () => {
          this._loadSavedChartsPanel(loadButton);
        });

        const saveButton = document.createElement("button");
        saveButton.type = "button";
        saveButton.classList.add("chart-tool__action");
        saveButton.title = this._t("Save chart");
        saveButton.setAttribute("aria-label", saveButton.title);
        saveButton.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h12l3 3v15H4V3h1Zm2 0v6h10V3M8 21v-8h8v8"/></svg>';
        saveButton.addEventListener("click", () => {
          this._openSaveChartPanel();
        });

        actions.append(loadButton, saveButton);

        const { loadPanel, savePanel } = this._createSavedChartsPanels();
        canvasWrapper.append(loadPanel, savePanel);
      }

      canvasWrapper.appendChild(actions);
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

  _createSavedChartsPanels() {
    const createPanel = (title, closeTitle) => {
      const panel = document.createElement("div");
      panel.classList.add("chart-tool__saved-chart-panel");
      panel.classList.add("chart-tool__saved-chart-panel--closed");
      panel.inert = true;
      panel.setAttribute("aria-hidden", "true");
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-label", this._t(title));

      const header = document.createElement("div");
      header.classList.add("chart-tool__saved-chart-panel-header");

      const heading = document.createElement("div");
      heading.classList.add(this.CSS.label);
      heading.textContent = this._t(title);

      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.classList.add("chart-tool__saved-chart-close");
      closeButton.textContent = "×";
      closeButton.title = this._t(closeTitle);
      closeButton.setAttribute("aria-label", closeButton.title);
      closeButton.addEventListener("click", () => {
        panel.classList.add("chart-tool__saved-chart-panel--closed");
        panel.inert = true;
        panel.setAttribute("aria-hidden", "true");
      });

      header.append(heading, closeButton);
      panel.appendChild(header);

      const status = document.createElement("div");
      status.classList.add("chart-tool__saved-charts-status");
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");

      return { panel, status };
    };

    const load = createPanel("Load saved charts", "Close");
    const select = document.createElement("select");
    select.classList.add(this.CSS.input, "chart-tool__saved-charts-select");
    const promptOption = document.createElement("option");
    promptOption.value = "";
    promptOption.textContent = this._t("Load the list to choose a chart");
    select.appendChild(promptOption);

    const applyButton = document.createElement("button");
    applyButton.type = "button";
    applyButton.classList.add("chart-tool__saved-charts-button");
    applyButton.textContent = this._t("Apply");
    applyButton.disabled = true;

    select.addEventListener("change", () => {
      applyButton.disabled = select.value === "";
    });
    applyButton.addEventListener("click", () => {
      const selectedChart = this.savedCharts[Number(select.value)];
      if (!selectedChart?.data || !this._isValidChartData(selectedChart.data)) {
        load.status.textContent = this._t("Selected chart data is invalid");
        return;
      }

      this._applySavedChart(selectedChart.data);
      load.status.textContent = this._t("Chart loaded into the editor");
      load.panel.classList.add("chart-tool__saved-chart-panel--closed");
      load.panel.inert = true;
      load.panel.setAttribute("aria-hidden", "true");
    });

    const loadRow = document.createElement("div");
    loadRow.classList.add("chart-tool__saved-charts-row");
    loadRow.append(select, applyButton);
    load.panel.appendChild(loadRow);
    load.panel.appendChild(load.status);

    const save = createPanel("Save chart", "Close");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.classList.add(this.CSS.input);
    nameInput.placeholder = this._t("Chart name");

    const submitButton = document.createElement("button");
    submitButton.type = "button";
    submitButton.classList.add("chart-tool__saved-charts-button");
    submitButton.textContent = this._t("Save");
    submitButton.addEventListener("click", async () => {
      const name = nameInput.value.trim();
      if (!name) {
        save.status.textContent = this._t("Enter a name for the chart");
        nameInput.focus();
        return;
      }

      submitButton.disabled = true;
      save.status.textContent = this._t("Saving chart...");
      try {
        const response = await fetch(this.savedChartsUrl, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, data: this.save() }),
        });
        if (!response.ok) {
          throw new Error("request failed");
        }

        save.status.textContent = this._t("Chart saved");
        nameInput.value = "";
      } catch (error) {
        save.status.textContent = this._t("Could not save chart");
      } finally {
        submitButton.disabled = false;
      }
    });

    const saveRow = document.createElement("div");
    saveRow.classList.add("chart-tool__saved-charts-row");
    saveRow.append(nameInput, submitButton);
    save.panel.appendChild(saveRow);
    save.panel.appendChild(save.status);

    this.loadChartPanel = load.panel;
    this.loadChartSelect = select;
    this.loadChartStatus = load.status;
    this.saveChartPanel = save.panel;
    this.saveChartInput = nameInput;
    this.saveChartStatus = save.status;

    return { loadPanel: load.panel, savePanel: save.panel };
  }

  _openSaveChartPanel() {
    this.loadChartPanel.classList.add("chart-tool__saved-chart-panel--closed");
    this.loadChartPanel.inert = true;
    this.loadChartPanel.setAttribute("aria-hidden", "true");
    this.saveChartInput.value = this.data.title || "";
    this.saveChartStatus.textContent = "";
    this.saveChartPanel.classList.remove("chart-tool__saved-chart-panel--closed");
    this.saveChartPanel.inert = false;
    this.saveChartPanel.setAttribute("aria-hidden", "false");
    this.saveChartInput.focus();
  }

  async _loadSavedChartsPanel(button) {
    if (!this.loadChartPanel.classList.contains("chart-tool__saved-chart-panel--closed")) {
      this.loadChartPanel.classList.add("chart-tool__saved-chart-panel--closed");
      this.loadChartPanel.inert = true;
      this.loadChartPanel.setAttribute("aria-hidden", "true");
      return;
    }

    this.saveChartPanel.classList.add("chart-tool__saved-chart-panel--closed");
    this.saveChartPanel.inert = true;
    this.saveChartPanel.setAttribute("aria-hidden", "true");
    button.disabled = true;
    this.loadChartSelect.replaceChildren();
    this.loadChartStatus.textContent = this._t("Loading saved charts...");

    try {
      const response = await fetch(this.savedChartsUrl, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error("request failed");
      }

      const result = await response.json();
      const charts = Array.isArray(result) ? result : result.charts;
      if (!Array.isArray(charts)) {
        throw new Error("invalid response");
      }

      this.savedCharts = charts;
      const promptOption = document.createElement("option");
      promptOption.value = "";
      promptOption.textContent = this._t("Load the list to choose a chart");
      this.loadChartSelect.appendChild(promptOption);
      charts.forEach((chart, index) => {
        const option = document.createElement("option");
        option.value = String(index);
        option.textContent = chart.name || `${this._t("Chart")} ${index + 1}`;
        this.loadChartSelect.appendChild(option);
      });

      this.loadChartStatus.textContent = charts.length
        ? this._t("Saved charts loaded")
        : this._t("No saved charts found");
    } catch (error) {
      this.loadChartStatus.textContent = this._t("Could not load saved charts");
    } finally {
      button.disabled = false;
      this.loadChartPanel.classList.remove("chart-tool__saved-chart-panel--closed");
      this.loadChartPanel.inert = false;
      this.loadChartPanel.setAttribute("aria-hidden", "false");
      this.loadChartSelect.focus();
    }
  }

  _isValidChartData(data) {
    return (
      data &&
      typeof data === "object" &&
      ["bar", "line", "pie", "doughnut", "radar", "polarArea"].includes(
        data.type,
      ) &&
      Array.isArray(data.labels) &&
      Array.isArray(data.datasets) &&
      data.datasets.length > 0 &&
      data.datasets.every(
        (dataset) =>
          dataset &&
          Array.isArray(dataset.data) &&
          dataset.data.every(Number.isFinite),
      )
    );
  }

  _applySavedChart(data) {
    const chartData = {
      type: data.type,
      title: data.title || "",
      labels: [...data.labels],
      datasets: data.datasets.map((dataset) => ({ ...dataset })),
    };
    if (this.saveImage && data.image) {
      chartData.image = data.image;
    }

    this.data = chartData;
    this._updateChart();

    const isSettingsVisible = this.settingsExpanded;
    const refreshedSettings = this._createSettings();
    refreshedSettings.id = this.settingsId;
    refreshedSettings.classList.toggle(
      "chart-tool__settings--collapsed",
      !isSettingsVisible,
    );
    refreshedSettings.inert = !isSettingsVisible;
    refreshedSettings.setAttribute("aria-hidden", String(!isSettingsVisible));
    this.settingsPanel.replaceWith(refreshedSettings);
    this.settingsPanel = refreshedSettings;
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
