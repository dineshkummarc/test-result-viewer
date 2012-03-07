/* See license.txt for terms of usage */

CDB.ns(function() { with (CDB) { with (Domplate) {

// ************************************************************************************************

/**
 * @domplate Basic template for tabular reports. This template is usually used for displaying
 * data from DB tables.
 */
var TableRep = domplate(CDB.Rep,
{
    className: "table",

    tag:
        DIV({"class": "profileSizer"},
            TABLE({"class": "profileTable", cellspacing: 0, cellpadding: 0, width: "100%",
                "role": "grid"},
                THEAD({"class": "profileThead", "role": "presentation"},
                    TR({"class": "headerRow focusRow profileRow subFocusRow", "role": "row",
                        onclick: "$onClickHeader"},
                        FOR("column", "$columns",
                            TH({"class": "headerCell headerCol a11yFocus",
                                "role": "columnheader",
                                $alphaValue: "$column.alphaValue", _repObject: "$column"},
                                DIV({"class": "headerCellBox"},
                                    "$column.label"
                                )
                            )
                        )
                    )
                ),
                TBODY({"class": "profileTbody", "role": "presentation"},
                    FOR("row", "$object|getRows",
                        TR({"class": "focusRow profileRow subFocusRow", "role": "row",
                            _repObject: "$row"},
                            FOR("column", "$row|getColumns",
                                TD({"class": "a11yFocus profileCell $column|getColClass",
                                    "role": "gridcell"},
                                    TAG("$column|getValueTag", {object: "$column|getValue"})
                                )
                            )
                        )
                    )
                )
            )
        ),

    getValueTag: function(object)
    {
        var rep = object.rep ? object.rep : CDB.Reps.String;
        return rep.shortTag || rep.tag;
    },

    getColClass: function(column)
    {
        return column.colClass ? column.colClass : "";
    },

    getValue: function(object)
    {
        return object.value;
    },

    getRows: function(data)
    {
        var props = this.getProps(data);
        if (!props.length)
            return [];
        return props;
    },

    getColumns: function(row)
    {
        if (typeof(row) != "object")
            return [row];

        var cols = [];
        for (var i=0; i<this.columns.length; i++)
        {
            var column = this.columns[i];
            var value = getObjectProperty(row, column.property);
            cols.push({value: value, rep: column.rep, colClass: column.colClass});
        }

        return cols;
    },

    getProps: function(obj)
    {
        if (typeof(obj) != "object")
            return [obj];

        if (obj.length)
            return cloneArray(obj);

        var arr = [];
        for (var p in obj)
            arr.push(obj[p]);
        return arr;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Sorting

    onClickHeader: function(event)
    {
        var table = getAncestorByClass(event.target, "profileTable");
        var header = getAncestorByClass(event.target, "headerCol");
        if (!header)
            return;

        var numerical = !hasClass(header, "alphaValue");

        var colIndex = 0;
        for (header = header.previousSibling; header; header = header.previousSibling)
            ++colIndex;

        this.sort(table, colIndex, numerical);
    },

    sort: function(table, colIndex, numerical)
    {
        var tbody = getChildByClass(table, "profileTbody");
        var thead = getChildByClass(table, "profileThead");

        var values = [];
        for (var row = tbody.childNodes[0]; row; row = row.nextSibling)
        {
            var cell = row.childNodes[colIndex];
            var value = numerical ? parseFloat(cell.textContent) : cell.textContent;
            values.push({row: row, value: value});
        }

        values.sort(function(a, b) { return a.value < b.value ? -1 : 1; });

        var headerRow = thead.firstChild;
        var headerSorted = getChildByClass(headerRow, "headerSorted");
        removeClass(headerSorted, "headerSorted");
        if (headerSorted)
            headerSorted.removeAttribute('aria-sort');

        var header = headerRow.childNodes[colIndex];
        setClass(header, "headerSorted");

        if (!header.sorted || header.sorted == 1)
        {
            removeClass(header, "sortedDescending");
            setClass(header, "sortedAscending");
            header.setAttribute("aria-sort", "ascending");

            header.sorted = -1;

            for (var i = 0; i < values.length; ++i)
                tbody.appendChild(values[i].row);
        }
        else
        {
            removeClass(header, "sortedAscending");
            setClass(header, "sortedDescending");
            header.setAttribute("aria-sort", "descending")

            header.sorted = 1;

            for (var i = values.length-1; i >= 0; --i)
                tbody.appendChild(values[i].row);
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Dynamic Header Generation

    /**
     * Analyse data and return dynamically created list of columns.
     * @param {Object} data
     */
    getHeaderColumns: function(data)
    {
        // Get the first row in the object.
        var firstRow;
        for (var p in data)
        {
            firstRow = data[p];
            break;
        }

        if (typeof(firstRow) != "object")
            return [{label: "Object Properties"}]; //xxxHonza: localization

        // Put together a column property, label and type (type for default sorting logic).
        var header = [];
        for (var p in firstRow)
        {
            var value = firstRow[p];
            header.push({
                property: p,
                label: p,
                alphaValue: (typeof(value) != "number")
            });
        }

        return header;
    }
});

// ************************************************************************************************
//* Table object

CDB.Reps.Table = function(columns, options)
{
    this.columns = columns;
    this.options = options || {};
}

CDB.Reps.Table.prototype =
{
    render: function(data, parentNode, cols)
    {
        if (!data)
            return;

        if (!cols)
            cols = this.columns;

        // Get header info from passed argument (can be null).
        var columns = [];
        for (var i=0; cols && i<cols.length; i++)
        {
            var col = cols[i];
            columns.push({
                property: (typeof(col.property) != "undefined") ? col.property : col.toString(),
                label: (typeof(col.label) != "undefined") ? col.label : col.toString(),
                rep: (typeof(col.rep) != "undefined") ? col.rep : null,
                alphaValue: (typeof(col.alphaValue) != "undefined") ? col.alphaValue : true,
                colClass: col.colClass
            });
        }

        // Generate header info from the data dynamically.
        if (!columns.length)
            columns = TableRep.getHeaderColumns(data);

        try
        {
            TableRep.columns = columns; //xxxHonza: how to get rid of this hack
            this.table = TableRep.tag.replace({object: data, columns: columns}, parentNode);

            // Set vertical height for scroll bar.
            var maxHeight = this.options ? this.options.maxHeight : 0;
            if (maxHeight > 0)
            {
                // xxxHonza: works only in FF.
                var tBody = this.table.querySelector(".profileTbody");
                if (tBody.clientHeight > maxHeight)
                    tBody.style.height = maxHeight + "px";
            }
        }
        catch (err)
        {
            exception("table.render EXCEPTION " + err, err);
        }
        finally
        {
            delete TableRep.columns;
        }

        return this.table;
    },

    sort: function(property, desc)
    {
        var colIndex = -1;
        var numerical = false;

        var cols = this.table.querySelectorAll(".headerCol");
        for (var i=0; i<cols.length; i++)
        {
            var column = cols[i].repObject;
            if (column.property == property)
            {
                colIndex = i;
                numerical = !hasClass(cols[i], "alphaValue");
                break;
            }
        }

        if (colIndex == -1)
            return;

        TableRep.sort(this.table, colIndex, numerical);
        if (desc)
            TableRep.sort(this.table, colIndex, numerical);
    }
};

// ************************************************************************************************
}}});
