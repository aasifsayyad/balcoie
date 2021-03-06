$(document).ready(function () {
	$("#printBtn").click(function () {
		var mode = 'iframe'; // popup
		var close = mode == "popup";
		var options = {
			mode: mode,
			popClose: close
		};
		$("div.printPage").printArea(options);
	});
	var t = $('#plantHead').DataTable({
                                                        info: false,
				retrieve: true,
				searching: false,
				paging: false,
				columnDefs: [{
					targets: "_all",
					orderable: false
				}]

	});
	$.each(plantHead, function (key) {
		var rankingElements = [];
		var batch = {
			"database": {
				"Method": "GET",
				"Resource": baseServiceUrl + "elements?path=\\\\" + afServerName + "\\" + afDatabaseName + "\\KPIS\\PlantHead\\" + plantHead[key].afname + "&selectedFields=WebId;Links.Elements"
			},
			"elements": {
				"Method": "GET",
				"Resource": "{0}?selectedFields=Items.Name;Items.Path;&searchFullHierarchy=true",
				"ParentIds": ["database"],
				"Parameters": ["$.database.Content.Links.Elements"]
			},
			"attributes": {
				"Method": "GET",
				"RequestTemplate": {
					"Resource": baseServiceUrl + "attributes/multiple?selectedFields=Items.Object.Name;Items.Object.Path;Items.Object.WebId&" + plantHead[key].path
				},
				"ParentIds": ["elements"],
				"Parameters": ["$.elements.Content.Items[*].Path"]
			},
			"values": {
				"Method": "GET",
				"RequestTemplate": {
					"Resource": baseServiceUrl + "streams/{0}/value"
				},
				"ParentIds": ["attributes"],
				"Parameters": ["$.attributes.Content.Items[*].Content.Items[*].Object.WebId"]
			}
		};
		var batchStr = JSON.stringify(batch, null, 2);
		var batchResult = processJsonContent(baseServiceUrl + "batch", 'POST', batchStr);
		$.when(batchResult).fail(function () {
			warningmsg("Cannot Launch Batch!!!");
		});
		$.when(batchResult).done(function () {
			var batchResultItems = (batchResult.responseJSON.attributes.Content.Items);
			var valuesID = 0;
			var UOM = "-";
			var UO = (batchResult.responseJSON.values.Content.Items[valuesID].Content.UnitsAbbreviation);
			if (UO) {
				UOM = UO;
			}
			$.each(batchResultItems, function (elementID) {
				var attrItems = batchResultItems[elementID].Content.Items;
				var elementName = batchResult.responseJSON.elements.Content.Items[elementID].Name;
				var elementItems = [];
				attrItems.forEach(function (attr, attrID) {
					var attrValue = "-";
					if (attr !== undefined && attr.Object !== undefined) {
						attrName = attr.Object.Name;
						if (batchResult.responseJSON.values.Content.Items !== undefined && (batchResult.responseJSON.values.Content.Status === undefined || batchResult.responseJSON.values.Content.Status < 400) && batchResult.responseJSON.values.Content.Items[valuesID].Status === 200) {
							var attrV = batchResult.responseJSON.values.Content.Items[valuesID].Content.Value;
							if (attrV !== "" && !isNaN(attrV)) {
								attrValue = (attrV).toFixed(plantHead[key].digits);
							}
						}
					}
					elementItems[attrID] = attrValue;
					valuesID++;
				});
				rankingElements[elementID] = elementItems;
			});
			var rows = [];
			rows.push(plantHead[key].sr);
			rows.push(plantHead[key].afname);
			rows.push(UOM);
			$.each(rankingElements, function (key1) {
				rows.push(rankingElements[key1][1], rankingElements[key1][0]);
			});
			t.row.add(rows).draw(!1);
		});
		t.page.len(-1).draw();
	});
});